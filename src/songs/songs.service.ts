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
import { NotificationsService } from '../notifications/notifications.service';

// ── Helpers de busqueda ─────────────────────────────────────

/**
 * Escapa caracteres especiales de regex en el texto que escribe el usuario.
 * Necesario para que si alguien busca "(", ".", "+", etc., el regex no se rompa.
 */
function escapeRegex(s: string): string {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Convierte un termino normalizado (sin acentos, lowercase) en un patron regex
 * que matchea esa palabra con o sin acentos.
 *
 * Ejemplo: "el" → "[eéèêë][lL]"  → matchea "el", "él", "El", etc.
 *          "cancion" → "[cC][aáàâäã][nN][cC][iíìîï][oóòôöõ][nñ]" → matchea "canción" o "cancion"
 */
function accentInsensitivePattern(term: string): string {
  const vowelMap: Record<string, string> = {
    a: '[aáàâäãAÁÀÂÄÃ]',
    e: '[eéèêëEÉÈÊË]',
    i: '[iíìîïIÍÌÎÏ]',
    o: '[oóòôöõOÓÒÔÖÕ]',
    u: '[uúùûüUÚÙÛÜ]',
    n: '[nñNÑ]',
  };
  return escapeRegex(term)
    .split('')
    .map((c) => vowelMap[c.toLowerCase()] ?? c)
    .join('');
}

@Injectable()
export class SongsService {
  constructor(
    @InjectModel(Song.name) private readonly songModel: Model<SongDocument>,
    private readonly transposer: TransposerService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Lectura pública ──────────────────────────────────

  async search(dto: SearchSongsDto) {
    const { q, genre, page = 1, limit = 20 } = dto;
    const filter: Record<string, unknown> = { status: 'published' };

    if (genre) {
      filter.genre = genre.toLowerCase();
    }

    if (q && q.trim()) {
      // Buscamos con AND: todos los terminos que escribio el usuario deben
      // aparecer en el title o el artist. Cada termino es accent-insensitive
      // (matchea "el" con "Él", "canción" con "cancion", etc.) y case-insensitive.
      // Esto evita el problema de la busqueda OR de MongoDB $text que devuelve
      // cualquier cancion que contenga UNA sola palabra de la query.
      const terms = q
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());

      if (terms.length > 0) {
        filter.$and = terms.map((term) => ({
          $or: [
            { title: { $regex: accentInsensitivePattern(term), $options: 'i' } },
            { artist: { $regex: accentInsensitivePattern(term), $options: 'i' } },
          ],
        }));
      }
    }

    const skip = (page - 1) * limit;

    // Sin $text → ordenamos por createdAt desc por default; el frontend
    // re-ordena segun el chip activo (A-Z, Artista, etc).
    const [data, total] = await Promise.all([
      this.songModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-sections')
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

  // ── Lista compartida (setlist global) ────────────────────────

  async toggleList(id: string, inList?: boolean) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Canción no encontrada');
    }
    // Si no nos pasan el valor, hacemos toggle del actual
    let nextValue: boolean;
    if (typeof inList === 'boolean') {
      nextValue = inList;
    } else {
      const current = await this.songModel
        .findById(id)
        .select('inList')
        .lean()
        .exec();
      if (!current) throw new NotFoundException('Canción no encontrada');
      nextValue = !current.inList;
    }
    const updated = await this.songModel
      .findByIdAndUpdate(id, { inList: nextValue }, { new: true })
      .select('_id title artist inList')
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('Canción no encontrada');

    // Marcar que la lista cambio para que aparezca el boton "Notificar" en todos los celulares
    await this.notifications.markListChanged();
    return updated;
  }

  async listIds(): Promise<string[]> {
    const result = await this.songModel
      .find({ inList: true, status: 'published' })
      .select('_id')
      .lean()
      .exec();
    return result.map((r) => r._id.toString());
  }
}
