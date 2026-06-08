import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EventDocument = HydratedDocument<EventEntity>;

/**
 * Confirmacion de asistencia (RSVP) de un usuario a un evento.
 * status='yes' -> va. status='no' -> no va. Ausencia -> pendiente.
 */
@Schema({ _id: false })
export class EventAttendee {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ enum: ['yes', 'no'], required: true })
  status!: string;

  @Prop({ default: () => new Date() })
  updatedAt!: Date;
}

@Schema({ timestamps: true, collection: 'events' })
export class EventEntity {
  @Prop({ required: true, trim: true })
  name!: string;

  // Fecha + hora del evento (cuando sucede). Se compara con `new Date()` para
  // saber si es pasado y filtrar/ordenar.
  @Prop({ required: true, type: Date, index: true })
  date!: Date;

  @Prop({ trim: true })
  address?: string;

  // Información adicional opcional (textarea libre).
  @Prop({ trim: true })
  info?: string;

  // ObjectId del usuario que lo creó. Útil para auditar.
  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  // Lista de RSVPs. Los usuarios sin entrada aca se consideran "pendientes".
  @Prop({ type: [EventAttendee], default: [] })
  attendees!: EventAttendee[];
}

export const EventSchema = SchemaFactory.createForClass(EventEntity);
EventSchema.index({ date: 1 });
