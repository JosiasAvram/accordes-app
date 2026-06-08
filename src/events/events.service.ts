import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { EventEntity, EventDocument } from './schemas/event.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

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
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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

  // Eventos pasados (historico), del mas reciente al mas viejo.
  async listPast() {
    const until = new Date();
    until.setHours(0, 0, 0, 0);
    return this.model
      .find({ date: { $lt: until } })
      .sort({ date: -1 })
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

  // ── RSVP ──────────────────────────────────────────────

  /**
   * Setea (o actualiza) la respuesta de asistencia del usuario al evento.
   * status='yes' va, status='no' no va.
   */
  async rsvp(eventId: string, userId: string, status: 'yes' | 'no') {
    if (status !== 'yes' && status !== 'no') {
      throw new BadRequestException('status debe ser "yes" o "no"');
    }
    const userObjId = new Types.ObjectId(userId);
    const now = new Date();

    // Intento 1: si el user ya tiene una entrada, la updateo in-place.
    const updated = await this.model
      .updateOne(
        { _id: eventId, 'attendees.userId': userObjId },
        { $set: { 'attendees.$.status': status, 'attendees.$.updatedAt': now } },
      )
      .exec();

    if (updated.matchedCount === 0) {
      // No existia entrada: la agrego con $push.
      const result = await this.model
        .updateOne(
          { _id: eventId },
          { $push: { attendees: { userId: userObjId, status, updatedAt: now } } },
        )
        .exec();
      if (result.matchedCount === 0) {
        throw new NotFoundException('Evento no encontrado');
      }
    }

    const event = await this.model.findById(eventId).lean().exec();
    return event;
  }

  /**
   * Devuelve la asistencia del evento agrupada en 3 listas:
   * confirmados (yes), no van (no), pendientes (usuarios con instrumento que
   * no respondieron). Cada user incluye id, name, lastName, instrument.
   */
  async getAttendance(eventId: string) {
    const event = await this.model.findById(eventId).lean().exec();
    if (!event) throw new NotFoundException('Evento no encontrado');

    // Traemos todos los usuarios con instrumento (los "miembros activos" de la banda)
    const allUsers = await this.userModel
      .find({ instrument: { $exists: true, $ne: null } })
      .select('username name lastName instrument role')
      .lean()
      .exec();

    const yesIds = new Set<string>();
    const noIds = new Set<string>();
    for (const a of event.attendees ?? []) {
      const uid = (a.userId as unknown as { toString(): string }).toString();
      if (a.status === 'yes') yesIds.add(uid);
      else if (a.status === 'no') noIds.add(uid);
    }

    const mapUser = (u: typeof allUsers[number]) => ({
      id: (u._id as { toString(): string }).toString(),
      username: u.username,
      name: u.name,
      lastName: u.lastName,
      instrument: u.instrument,
    });

    const confirmed = allUsers.filter((u) => yesIds.has((u._id as { toString(): string }).toString())).map(mapUser);
    const rejected = allUsers.filter((u) => noIds.has((u._id as { toString(): string }).toString())).map(mapUser);
    const pending = allUsers
      .filter((u) => {
        const id = (u._id as { toString(): string }).toString();
        return !yesIds.has(id) && !noIds.has(id);
      })
      .map(mapUser);

    return { confirmed, rejected, pending };
  }
}
