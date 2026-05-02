import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SongsService } from './songs.service';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SearchSongsDto } from './dto/search-songs.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('songs')
@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  // ── Públicos ─────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listado paginado de canciones' })
  list(@Query() dto: SearchSongsDto) {
    return this.songsService.search(dto);
  }

  @Get('search')
  @ApiOperation({ summary: 'Búsqueda por título/artista (full-text)' })
  search(@Query() dto: SearchSongsDto) {
    return this.songsService.search(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle completo de una canción' })
  findById(@Param('id') id: string) {
    return this.songsService.findById(id);
  }

  @Get('by-slug/:artistSlug/:titleSlug')
  @ApiOperation({ summary: 'Detalle por slugs amigables' })
  findBySlug(
    @Param('artistSlug') artistSlug: string,
    @Param('titleSlug') titleSlug: string,
  ) {
    return this.songsService.findBySlug(artistSlug, titleSlug);
  }

  @Get(':id/transpose')
  @ApiOperation({ summary: 'Devuelve la canción transpuesta N semitonos' })
  transpose(
    @Param('id') id: string,
    @Query('semitones', ParseIntPipe) semitones: number,
  ) {
    return this.songsService.transpose(id, semitones);
  }

  // ── Admin ────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear canción (admin)' })
  create(@Body() dto: CreateSongDto, @Req() req: { user: { sub: string } }) {
    return this.songsService.create(dto, req.user.sub);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar canción (admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateSongDto) {
    return this.songsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar canción (admin)' })
  delete(@Param('id') id: string) {
    return this.songsService.delete(id);
  }
}
