import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ChordDocument = HydratedDocument<Chord>;

/**
 * Una posicion/voicing de un acorde — la forma fisica concreta de tocarlo
 * en un instrumento. Un mismo acorde (ej: "C") tiene MUCHAS posiciones validas:
 *  - Abierto: -1, 3, 2, 0, 1, 0
 *  - Cejilla en 3°: 3, 3, 5, 5, 5, 3
 *  - Cejilla en 8°: -1, -1, 10, 9, 8, 8
 *  ... etc.
 */
@Schema({ _id: false })
export class ChordVoicing {
  /**
   * Etiqueta humana de esta posicion (ej: "Abierto", "Cejilla 3°").
   * Opcional — si no se setea, en el frontend se muestra como "Posicion N".
   */
  @Prop({ trim: true })
  label?: string;

  /**
   * 6 cuerdas (Mi6 → Mi1, de la mas grave a la mas aguda).
   *  -1 → cuerda silenciada (no se toca)
   *   0 → cuerda al aire
   *   1+ → traste donde va el dedo
   */
  @Prop({ type: [Number], required: true })
  frets!: number[];

  /**
   * Que dedo usa cada cuerda.
   *  0 → al aire o silenciada
   *  1 → indice, 2 → medio, 3 → anular, 4 → menique
   */
  @Prop({ type: [Number], default: [] })
  fingers!: number[];

  @Prop({ default: 1, min: 1, max: 24 })
  baseFret!: number;

  @Prop({ default: false })
  isBarre!: boolean;

  @Prop({ enum: ['principiante', 'intermedio', 'avanzado'], default: 'principiante' })
  difficulty!: string;
}

@Schema({ timestamps: true, collection: 'chords' })
export class Chord {
  @Prop({ required: true, trim: true })
  name!: string; // "C", "Am", "F#m7"

  @Prop({ required: true, default: 'guitar', enum: ['guitar', 'ukulele', 'piano'] })
  instrument!: string;

  /**
   * Lista de posiciones validas para este acorde.
   * El frontend muestra la primera por default y permite navegar con flechas
   * para ver las demas inversiones / posiciones / digitaciones alternativas.
   */
  @Prop({ type: [ChordVoicing], default: [] })
  voicings!: ChordVoicing[];

  @Prop({ enum: ['mayor', 'menor', 'septima', 'sus', 'dim', 'aug', 'otro'], default: 'mayor' })
  category!: string;
}

export const ChordSchema = SchemaFactory.createForClass(Chord);
ChordSchema.index({ name: 1, instrument: 1 }, { unique: true });
