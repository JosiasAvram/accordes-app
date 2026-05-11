import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SongDocument = HydratedDocument<Song>;

/**
 * Un acorde dentro de una línea: el acorde + su posición (índice de caracter)
 * en la letra. Esto permite renderizar el acorde EXACTAMENTE arriba de la
 * palabra correspondiente, sin depender de espacios literales.
 */
@Schema({ _id: false })
export class ChordPosition {
  @Prop({ required: true })
  chord!: string; // "C", "G7", "F#m7", "Am/G"

  @Prop({ required: true, min: 0 })
  position!: number; // índice de caracter en `text`
}

/**
 * Segmento de una linea con acordes "inline" (cuando una linea es solo
 * acordes pero contiene anotaciones intermedias como "(4x)" o "-> segunda vuelta").
 * En vez de perder el texto, lo guardamos pre-segmentado para poder renderizarlo
 * con los acordes coloreados y el resto como texto.
 */
@Schema({ _id: false })
export class InlineSegment {
  @Prop({ required: true, enum: ['text', 'chord'] })
  type!: string;

  @Prop({ required: true })
  content!: string;
}

@Schema({ _id: false })
export class SongLine {
  @Prop({ default: '' })
  text!: string;

  @Prop({ type: [ChordPosition], default: [] })
  chords!: ChordPosition[];

  /**
   * Si esta presente, indica que la linea es solo de acordes (sin letra debajo)
   * y debe renderizarse "inline" con cada segmento alternando texto y acordes.
   * Cuando esta ausente: la linea es chord+letra estandar (renderizado clasico).
   */
  @Prop({ type: [InlineSegment], default: undefined })
  inlineSegments?: InlineSegment[];
}

@Schema({ _id: false })
export class SongSection {
  @Prop({
    required: true,
    enum: ['intro', 'verso', 'estribillo', 'puente', 'solo', 'outro', 'otro'],
  })
  type!: string;

  @Prop()
  label?: string; // "Verso 1", "Estribillo", etc.

  @Prop({ type: [SongLine], default: [] })
  lines!: SongLine[];
}

@Schema({ timestamps: true, collection: 'songs' })
export class Song {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  artist!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  artistSlug!: string;

  @Prop({ required: true, lowercase: true, trim: true })
  titleSlug!: string;

  @Prop({ lowercase: true, trim: true, index: true })
  genre?: string;

  @Prop({ required: true, default: 'C' })
  originalKey!: string;

  @Prop({ default: 0, min: 0, max: 12 })
  capo!: number;

  @Prop({ enum: ['principiante', 'intermedio', 'avanzado'], default: 'intermedio' })
  difficulty!: string;

  @Prop({ type: [SongSection], default: [] })
  sections!: SongSection[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  contributedBy?: Types.ObjectId;

  @Prop({ default: 0 })
  views!: number;

  @Prop({ enum: ['draft', 'published'], default: 'published', index: true })
  status!: string;

  /**
   * Indica si esta cancion esta en la "Lista" compartida (setlist global).
   * Cualquier usuario con la app puede agregar/quitar canciones desde el celular.
   * Se sincroniza entre todos los dispositivos.
   */
  @Prop({ default: false, index: true })
  inList!: boolean;
}

export const SongSchema = SchemaFactory.createForClass(Song);

// Índice único compuesto: no puede haber dos canciones con el mismo
// (artistSlug + titleSlug). Permite URLs amigables sin colisiones.
SongSchema.index({ artistSlug: 1, titleSlug: 1 }, { unique: true });

// Índice de texto para búsqueda full-text por título y artista
SongSchema.index(
  { title: 'text', artist: 'text' },
  { weights: { title: 10, artist: 5 } },
);
