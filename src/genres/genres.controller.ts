import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Song, SongDocument } from '../songs/schemas/song.schema';

@ApiTags('genres')
@Controller('genres')
export class GenresController {
  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<SongDocument>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Géneros disponibles con conteo de canciones' })
  async list() {
    const result = await this.songModel.aggregate([
      { $match: { status: 'published', genre: { $exists: true, $ne: null } } },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $project: { genre: '$_id', count: 1, _id: 0 } },
      { $sort: { count: -1 } },
    ]);
    return result;
  }
}
