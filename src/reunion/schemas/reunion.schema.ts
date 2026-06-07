import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReunionDocument = HydratedDocument<Reunion>;

/**
 * Singleton: hay UNA sola "Reunión actual" compartida con toda la banda.
 * Solo usuarios con rol 'admin' o 'lider' pueden modificarla.
 *
 * Cada slot guarda el _id del usuario asignado. Puede ser null si nadie
 * está asignado todavía.
 */
@Schema({ timestamps: true, collection: 'reunion' })
export class Reunion {
  @Prop({ default: 'current' })
  key!: string; // siempre 'current', para que sea un singleton (find by key)

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  dirige?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  guitarra?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  piano?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  bajo?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  bateria?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  coro1?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  coro2?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  coro3?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  coro4?: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  coro5?: Types.ObjectId | null;
}

export const ReunionSchema = SchemaFactory.createForClass(Reunion);
ReunionSchema.index({ key: 1 }, { unique: true });
