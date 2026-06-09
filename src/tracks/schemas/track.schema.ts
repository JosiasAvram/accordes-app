import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TrackDocument = HydratedDocument<Track>;

@Schema({ timestamps: true, collection: 'tracks' })
export class Track {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ trim: true })
  artist?: string;

  // URL completa al video de YouTube (ej: https://youtu.be/xxx o https://youtube.com/watch?v=xxx)
  @Prop({ required: true, trim: true })
  youtubeUrl!: string;

  // El ID del video extraído (11 chars). Sirve para sacar thumbnail sin API key.
  @Prop({ required: true, trim: true })
  youtubeId!: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;
}

export const TrackSchema = SchemaFactory.createForClass(Track);
TrackSchema.index({ createdAt: -1 });
