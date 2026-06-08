import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EventDocument = HydratedDocument<EventEntity>;

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
}

export const EventSchema = SchemaFactory.createForClass(EventEntity);
EventSchema.index({ date: 1 });
