import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppStateDocument = HydratedDocument<AppState>;

/**
 * Estado global de la aplicacion. Hay un solo documento con key='global'.
 * Sirve para coordinar entre dispositivos (ej: cuando mostrar el boton "Notificar"
 * en la pestaña Lista).
 */
@Schema({ timestamps: true, collection: 'appState' })
export class AppState {
  @Prop({ required: true, unique: true, default: 'global' })
  key!: string;

  /**
   * Ultima vez que CUALQUIER usuario modifico la Lista (agrego o quito una cancion).
   */
  @Prop({ default: () => new Date() })
  lastListChange!: Date;

  /**
   * Ultima vez que CUALQUIER usuario envio una notificacion o descarto el boton "Notificar".
   * El boton es visible cuando lastListChange > lastNotificationAction.
   */
  @Prop({ default: () => new Date() })
  lastNotificationAction!: Date;
}

export const AppStateSchema = SchemaFactory.createForClass(AppState);
