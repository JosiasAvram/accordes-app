import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventsService } from './events.service';
import { NotificationsService } from '../notifications/notifications.service';

interface CreateEventBody {
  name: string;
  date: string; // ISO string
  address?: string;
  info?: string;
}

@ApiTags('events')
@Controller('events')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EventsController {
  constructor(
    private readonly service: EventsService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista los eventos. Por default solo próximos. ?past=true para históricos.' })
  @ApiQuery({ name: 'past', required: false, type: Boolean })
  list(@Query('past') past?: string) {
    if (past === 'true' || past === '1') return this.service.listPast();
    return this.service.listUpcoming();
  }

  @Post()
  @ApiOperation({ summary: 'Crea un evento. Solo admin o lider. Auto-notifica a todos.' })
  async create(@Req() req: { user: { sub: string; role: string } }, @Body() body: CreateEventBody) {
    this.requireAdminOrLider(req.user?.role);
    this.validateBody(body, true);
    const created = await this.service.create({
      name: body.name.trim(),
      date: new Date(body.date),
      address: body.address?.trim(),
      info: body.info?.trim(),
      createdBy: req.user.sub,
    });
    // Auto-notificacion a todos los celus con la app.
    const fechaTxt = this.formatEventDate(created.date);
    await this.notifications.sendToAll(
      'Nuevo evento',
      `${created.name} - ${fechaTxt}`,
      { type: 'event-created', action: 'open-events' },
    );
    return created;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita un evento. Solo admin o lider.' })
  update(
    @Req() req: { user: { role: string } },
    @Param('id') id: string,
    @Body() body: Partial<CreateEventBody>,
  ) {
    this.requireAdminOrLider(req.user?.role);
    this.validateBody(body as CreateEventBody, false);
    return this.service.update(id, {
      name: body.name?.trim(),
      date: body.date ? new Date(body.date) : undefined,
      address: body.address?.trim(),
      info: body.info?.trim(),
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina un evento. Solo admin o lider.' })
  remove(@Req() req: { user: { role: string } }, @Param('id') id: string) {
    this.requireAdminOrLider(req.user?.role);
    return this.service.remove(id);
  }

  // ── Helpers ────────────────────────────────────────────────

  private requireAdminOrLider(role: string | undefined) {
    if (role !== 'admin' && role !== 'lider') {
      throw new ForbiddenException(
        'Solo el admin o el líder pueden gestionar eventos.',
      );
    }
  }

  private validateBody(body: CreateEventBody, isCreate: boolean) {
    if (isCreate) {
      if (!body || !body.name || !body.date) {
        throw new BadRequestException('Faltan campos requeridos (name, date).');
      }
    }
    if (body.date !== undefined) {
      const parsed = new Date(body.date);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Fecha inválida.');
      }
    }
    if (body.name !== undefined && !body.name.trim()) {
      throw new BadRequestException('El nombre no puede estar vacío.');
    }
  }

  private formatEventDate(date: Date): string {
    const d = new Date(date);
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const hh = d.getHours().toString().padStart(2, '0');
    const mi = d.getMinutes().toString().padStart(2, '0');
    return `${dd}/${mm} ${hh}:${mi}hs`;
  }
}
