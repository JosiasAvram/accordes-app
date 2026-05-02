import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChordsService } from './chords.service';

@ApiTags('chords')
@Controller('chords')
export class ChordsController {
  constructor(private readonly chordsService: ChordsService) {}

  @Get()
  @ApiOperation({ summary: 'Listado de acordes (default: guitarra)' })
  list(@Query('instrument') instrument?: string) {
    return this.chordsService.list(instrument);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Acordes agrupados por categoría' })
  categories(@Query('instrument') instrument?: string) {
    return this.chordsService.groupedByCategory(instrument);
  }

  @Get(':name')
  @ApiOperation({ summary: 'Diagrama de un acorde específico' })
  findByName(
    @Param('name') name: string,
    @Query('instrument') instrument?: string,
  ) {
    return this.chordsService.findByName(name, instrument);
  }
}
