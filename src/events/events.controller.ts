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
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventsService } from './events.service';

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
  constructor(private readonly service: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los eventos próximos (no pasados). Cualquier autenticado.' })
  listUpcoming() {
    return this.service.listUpcoming();
  }

  @Post()
  @ApiOperation({ summary: 'Crea un evento. Solo admin o lider.' })
  create(@Req() req: { user: { sub: string; role: string } }, @Body() body: CreateEventBody) {
    this.requireAdminOrLider(req.user?.role);
    this.validateBody(body, true);
    return this.service.create({
      name: body.name.trim(),
      date: new Date(body.date),
      address: body.address?.trim(),
      info: body.info?.trim(),
      createdBy: req.user.sub,
    });
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
}
