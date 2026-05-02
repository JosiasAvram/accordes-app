import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChordDocument = HydratedDocument<Chord>;

@Schema({ timestamps: true, collection: 'chords' })
export class Chord {
  @Prop({ required: true, trim: true })
  name!: string; // "C", "Am", "F#m7"

  @Prop({ required: true, default: 'guitar', enum: ['guitar', 'ukulele', 'piano'] })
  instrument!: string;

  /**
   * 6 cuerdas de la guitarra (Mi6 → Mi1, de la más grave a la más aguda).
   *  -1 → cuerda silenciada (no se toca)
   *   0 → cuerda al aire
   *   1+ → traste donde va el dedo
   */
  @Prop({ type: [Number], required: true })
  frets!: number[];

  /**
   * Qué dedo usa cada cuerda.
   *  0 → al aire o silenciada
   *  1 → índice
   *  2 → medio
   *  3 → anular
   *  4 → meñique
   */
  @Prop({ type: [Number], default: [] })
  fingers!: number[];

  @Prop({ default: 1, min: 1, max: 24 })
  baseFret!: number;

  @Prop({ default: false })
  isBarre!: boolean;

  @Prop({ enum: ['principiante', 'intermedio', 'avanzado'], default: 'principiante' })
  difficulty!: string;

  @Prop({ enum: ['mayor', 'menor', 'septima', 'sus', 'dim', 'aug', 'otro'], default: 'mayor' })
  category!: string;
}

export const ChordSchema = SchemaFactory.createForClass(Chord);
ChordSchema.index({ name: 1, instrument: 1 }, { unique: true });
