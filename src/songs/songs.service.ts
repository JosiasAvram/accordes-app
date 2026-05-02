import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Song, SongDocument } from './schemas/song.schema';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { SearchSongsDto } from './dto/search-songs.dto';
import { TransposerService } from '../common/services/transposer.service';
import { slugify } from '../common/utils/slugify';

@Injectable()
export class SongsService {
  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<SongDocument>,
    private readonly transposer: TransposerService,
  ) {}

  // ── Lectura pública ──────────────────────────────────

  async search(dto: SearchSongsDto) {
    const { q, genre, page = 1, limit = 20 } = dto;
    const filter: Record<string, unknown> = { status: 'published' };

    if (genre) {
      filter.genre = genre.toLowerCase();
    }

    if (q && q.trim()) {
      // Búsqueda full-text con score
      filter.$text = { $search: q };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.songModel
        .find(filter, q ? { score: { $meta: 'textScore' } } : {})
        .sort(q ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-sections') // listado liviano: sin las letras completas
        .lean()
        .exec(),
      this.songModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Canción no encontrada');
    }
    const song = await this.songModel.findById(id).lean().exec();
    if (!song) throw new NotFoundException('Canción no encontrada');
    // contador de vistas (fire and forget)
    this.songModel.updateOne({ _id: id }, { $inc: { views: 1 } }).exec();
    return song;
  }

  async findBySlug(artistSlug: string, titleSlug: string) {
    const song = await this.songModel
      .findOne({ artistSlug, titleSlug })
      .lean()
      .exec();
    if (!song) throw new NotFoundException('Canción no encontrada');
    this.songModel
      .updateOne({ _id: song._id }, { $inc: { views: 1 } })
      .exec();
    return song;
  }

  async transpose(id: string, semitones: number) {
    if (semitones < -11 || semitones > 11) {
      throw new ConflictException('semitones debe estar entre -11 y 11');
    }
    const song = await this.findById(id);
    return this.transposer.transposeSong(song, semitones);
  }

  // ── Escritura admin ──────────────────────────────────

  async create(dto: CreateSongDto, userId?: string) {
    const artistSlug = slugify(dto.artist);
    const titleSlug = slugify(dto.title);

    // Verificar duplicado
    const existing = await this.songModel
      .findOne({ artistSlug, titleSlug })
      .lean()
      .exec();
    if (existing) {
      throw new ConflictException(
        `Ya existe una canción "${dto.title}" de "${dto.artist}"`,
      );
    }

    const created = await this.songModel.create({
      ...dto,
      artistSlug,
      titleSlug,
      contributedBy: userId ? new Types.ObjectId(userId) : undefined,
    });
    return created.toObject();
  }

  async update(id: string, dto: UpdateSongDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Canción no encontrada');
    }

    const update: Record<string, unknown> = { ...dto };
    if (dto.title) update.titleSlug = slugify(dto.title);
    if (dto.artist) update.artistSlug = slugify(dto.artist);

    const updated = await this.songModel
      .findByIdAndUpdate(id, update, { new: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('Canción no encontrada');
    return updated;
  }

  async delete(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Canción no encontrada');
    }
    const result = await this.songModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Canción no encontrada');
    return { deleted: true, id };
  }
}
