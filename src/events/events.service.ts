import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { EventEntity, EventDocument } from './schemas/event.schema';

export interface EventInput {
  name: string;
  date: Date;
  address?: string;
  info?: string;
  createdBy?: string;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(EventEntity.name) private readonly model: Model<EventDocument>,
  ) {}

  // Por defecto solo eventos cuyo `date` es futuro o de hoy.
  async listUpcoming() {
    const since = new Date();
    since.setHours(0, 0, 0, 0); // desde el inicio del dia actual
    return this.model
      .find({ date: { $gte: since } })
      .sort({ date: 1 })
      .lean()
      .exec();
  }

  async create(input: EventInput) {
    const doc = await this.model.create({
      name: input.name,
      date: input.date,
      address: input.address,
      info: input.info,
      createdBy: input.createdBy ? new Types.ObjectId(input.createdBy) : undefined,
    });
    return doc.toObject();
  }

  async update(id: string, input: Partial<EventInput>) {
    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.date !== undefined) updates.date = input.date;
    if (input.address !== undefined) updates.address = input.address;
    if (input.info !== undefined) updates.info = input.info;
    const updated = await this.model
      .findByIdAndUpdate(id, { $set: updates }, { new: true })
      .lean()
      .exec();
    if (!updated) throw new NotFoundException('Evento no encontrado');
    return updated;
  }

  async remove(id: string) {
    const result = await this.model.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException('Evento no encontrado');
    }
    return { ok: true };
  }
}
