import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChordPositionDto {
  @ApiProperty({ example: 'C' })
  @IsString()
  chord!: string;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;
}

export class SongLineDto {
  @ApiProperty({ example: 'Texto de la línea de la canción' })
  @IsString()
  text!: string;

  @ApiProperty({ type: [ChordPositionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChordPositionDto)
  chords!: ChordPositionDto[];
}

export class SongSectionDto {
  @ApiProperty({
    enum: ['intro', 'verso', 'estribillo', 'puente', 'solo', 'outro', 'otro'],
  })
  @IsEnum(['intro', 'verso', 'estribillo', 'puente', 'solo', 'outro', 'otro'])
  type!: string;

  @ApiPropertyOptional({ example: 'Verso 1' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ type: [SongLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SongLineDto)
  lines!: SongLineDto[];
}

export class CreateSongDto {
  @ApiProperty({ example: 'Título de la canción' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Nombre del artista' })
  @IsString()
  artist!: string;

  @ApiPropertyOptional({ example: 'rock-nacional' })
  @IsOptional()
  @IsString()
  genre?: string;

  @ApiProperty({ example: 'C' })
  @IsString()
  originalKey!: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(12)
  capo?: number;

  @ApiPropertyOptional({
    enum: ['principiante', 'intermedio', 'avanzado'],
    example: 'principiante',
  })
  @IsOptional()
  @IsEnum(['principiante', 'intermedio', 'avanzado'])
  difficulty?: string;

  @ApiProperty({ type: [SongSectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SongSectionDto)
  sections!: SongSectionDto[];

  @ApiPropertyOptional({ enum: ['draft', 'published'], example: 'published' })
  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: string;
}
