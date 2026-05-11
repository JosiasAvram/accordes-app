import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PushTokenDocument = HydratedDocument<PushToken>;

/**
 * Token de push notification de un dispositivo.
 * Se registra cuando la app arranca y obtiene su Expo push token.
 * Se borra (o marca como inactivo) si Expo nos avisa que el token es invalido.
 */
@Schema({ timestamps: true, collection: 'pushTokens' })
export class PushToken {
  @Prop({ required: true, unique: true, trim: true })
  token!: string;

  @Prop({ enum: ['ios', 'android', 'web'], default: 'android' })
  platform!: string;

  @Prop({ default: true })
  active!: boolean;

  /**
   * Identificador opcional del dispositivo, para evitar que un mismo celular
   * que reinstala la app genere un token huerfano (lo reemplazamos por el nuevo).
   */
  @Prop({ trim: true })
  deviceId?: string;
}

export const PushTokenSchema = SchemaFactory.createForClass(PushToken);
