import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TracksService } from './tracks.service';

interface CreateBody {
  name: string;
  artist?: string;
  youtubeUrl: string;
}

@ApiTags('tracks')
@Controller('tracks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TracksController {
  constructor(private readonly service: TracksService) {}

  @Get()
  @ApiOperation({ summary: 'Lista todas las pistas de YouTube. Cualquier autenticado.' })
  list() {
    return this.service.list();
  }

  @Post()
  @ApiOperation({ summary: 'Crea una pista (link de YouTube). Solo admin o lider.' })
  create(@Req() req: { user: { sub: string; role: string } }, @Body() body: CreateBody) {
    this.requireAdminOrLider(req.user?.role);
    if (!body || !body.name || !body.youtubeUrl) {
      throw new BadRequestException('Faltan campos requeridos (name, youtubeUrl).');
    }
    return this.service.create({
      name: body.name,
      artist: body.artist,
      youtubeUrl: body.youtubeUrl,
      createdBy: req.user.sub,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Elimina una pista. Solo admin o lider.' })
  remove(@Req() req: { user: { role: string } }, @Param('id') id: string) {
    this.requireAdminOrLider(req.user?.role);
    return this.service.remove(id);
  }

  private requireAdminOrLider(role: string | undefined) {
    if (role !== 'admin' && role !== 'lider') {
      throw new ForbiddenException(
        'Solo el admin o el líder pueden gestionar las pistas.',
      );
    }
  }
}
