import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Reunion, ReunionDocument } from './schemas/reunion.schema';
import { NotificationsService } from '../notifications/notifications.service';

export const REUNION_SLOTS = [
  'dirige',
  'guitarra',
  'piano',
  'bajo',
  'bateria',
  'coro1',
  'coro2',
  'coro3',
  'coro4',
  'coro5',
] as const;

export type ReunionSlot = (typeof REUNION_SLOTS)[number];

export interface ReunionAssignments {
  dirige?: string | null;
  guitarra?: string | null;
  piano?: string | null;
  bajo?: string | null;
  bateria?: string | null;
  coro1?: string | null;
  coro2?: string | null;
  coro3?: string | null;
  coro4?: string | null;
  coro5?: string | null;
}

@Injectable()
export class ReunionService {
  constructor(
    @InjectModel(Reunion.name) private readonly model: Model<ReunionDocument>,
    private readonly notifications: NotificationsService,
  ) {}

  // Devuelve el documento de la reunion actual, creándolo si no existe.
  // Populate completo con datos de cada usuario asignado.
  async getCurrent() {
    let doc = await this.model
      .findOne({ key: 'current' })
      .populate('dirige guitarra piano bajo bateria coro1 coro2 coro3 coro4 coro5', 'username name lastName instrument')
      .exec();
    if (!doc) {
      doc = await this.model.create({ key: 'current' });
      doc = await this.model
        .findOne({ key: 'current' })
        .populate('dirige guitarra piano bajo bateria coro1 coro2 coro3 coro4 coro5', 'username name lastName instrument')
        .exec();
    }
    if (!doc) throw new NotFoundException('Reunion no encontrada');
    return doc;
  }

  // Asigna (o limpia) los slots. Pasa null/undefined para vaciar.
  async updateAssignments(assignments: ReunionAssignments) {
    const updates: Record<string, Types.ObjectId | null> = {};
    for (const slot of REUNION_SLOTS) {
      const v = assignments[slot];
      if (v === undefined) continue; // no se toca este slot
      updates[slot] = v ? new Types.ObjectId(v) : null;
    }
    await this.model.updateOne(
      { key: 'current' },
      { $set: updates },
      { upsert: true },
    );
    // Avisar al modulo de notificaciones para que en la app aparezca
    // el boton "Notificar a todos" en la pantalla Reunion.
    await this.notifications.markReunionChanged();
    return this.getCurrent();
  }
}
