import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Track, TrackDocument } from './schemas/track.schema';

export interface CreateTrackInput {
  name: string;
  artist?: string;
  youtubeUrl: string;
  createdBy?: string;
}

@Injectable()
export class TracksService {
  constructor(
    @InjectModel(Track.name) private readonly model: Model<TrackDocument>,
  ) {}

  async list() {
    return this.model.find().sort({ createdAt: -1 }).lean().exec();
  }

  async create(input: CreateTrackInput) {
    const youtubeId = extractYouTubeId(input.youtubeUrl);
    if (!youtubeId) {
      throw new BadRequestException(
        'URL de YouTube inválida. Pegá un link tipo https://youtu.be/XXX o https://youtube.com/watch?v=XXX',
      );
    }
    const doc = await this.model.create({
      name: input.name.trim(),
      artist: input.artist?.trim(),
      youtubeUrl: input.youtubeUrl.trim(),
      youtubeId,
      createdBy: input.createdBy ? new Types.ObjectId(input.createdBy) : undefined,
    });
    return doc.toObject();
  }

  async remove(id: string) {
    const result = await this.model.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Pista no encontrada');
    }
    return { ok: true };
  }
}

/**
 * Saca el ID de un video de YouTube de cualquier URL común:
 *   https://www.youtube.com/watch?v=XXX
 *   https://youtu.be/XXX
 *   https://m.youtube.com/watch?v=XXX
 *   https://www.youtube.com/embed/XXX
 *   https://www.youtube.com/shorts/XXX
 * Devuelve null si no encontró un ID válido (11 chars alfanuméricos+_-).
 */
export function extractYouTubeId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  // Caso: el user pegó solo el ID (11 chars sueltos)
  if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  return null;
}
