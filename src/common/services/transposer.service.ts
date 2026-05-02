import { Injectable } from '@nestjs/common';

/**
 * TransposerService — sube o baja la tonalidad de un acorde (o canción
 * completa) en N semitonos. Maneja:
 *  - Acordes simples: C, D, Em, F#m
 *  - Sufijos: m, m7, maj7, sus4, dim, aug, add9, etc.
 *  - Bemoles y sostenidos: Bb, F#, Db
 *  - Acordes con bajo: C/G, F/A, Am/E
 *
 * Algoritmo:
 *  1. Parsear el acorde → raíz + sufijo + bajo opcional
 *  2. Convertir raíz a número 0-11 (C=0, C#=1, ..., B=11)
 *  3. Sumar semitonos módulo 12
 *  4. Convertir de vuelta a nota (preferencia ♯ o ♭ según contexto)
 *  5. Reconstruir el acorde
 */
@Injectable()
export class TransposerService {
  // Notas indexadas (preferencia: sostenidos)
  private readonly SHARP_NOTES = [
    'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  ];
  private readonly FLAT_NOTES = [
    'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
  ];

  // Mapa de cualquier notación → índice 0-11
  private readonly NOTE_TO_INDEX: Record<string, number> = {
    C: 0, 'B#': 0,
    'C#': 1, Db: 1,
    D: 2,
    'D#': 3, Eb: 3,
    E: 4, Fb: 4,
    F: 5, 'E#': 5,
    'F#': 6, Gb: 6,
    G: 7,
    'G#': 8, Ab: 8,
    A: 9,
    'A#': 10, Bb: 10,
    B: 11, Cb: 11,
  };

  /**
   * Transpone un acorde individual en N semitonos.
   * Ej: transposeChord("Am", 2) → "Bm"
   *     transposeChord("F#m7", -1) → "Fm7"
   *     transposeChord("C/G", 5) → "F/C"
   */
  transposeChord(chord: string, semitones: number, useFlats = false): string {
    if (!chord || semitones === 0) return chord;

    // Separar acorde y bajo (parte después de la "/")
    const [main, bass] = chord.split('/');
    const transposedMain = this.transposeNoteWithSuffix(main, semitones, useFlats);
    if (bass) {
      const transposedBass = this.transposeNoteWithSuffix(bass, semitones, useFlats);
      return `${transposedMain}/${transposedBass}`;
    }
    return transposedMain;
  }

  /**
   * Transpone una canción completa (estructura sections/lines/chords).
   */
  transposeSong<T extends { sections: Array<{ lines: Array<{ chords: Array<{ chord: string; position: number }> }> }>; originalKey?: string }>(
    song: T,
    semitones: number,
  ): T {
    if (semitones === 0) return song;

    const useFlats = this.shouldUseFlats(song.originalKey, semitones);

    const transposedSections = song.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...line,
        chords: line.chords.map((c) => ({
          ...c,
          chord: this.transposeChord(c.chord, semitones, useFlats),
        })),
      })),
    }));

    return {
      ...song,
      sections: transposedSections,
      originalKey: song.originalKey
        ? this.transposeChord(song.originalKey, semitones, useFlats)
        : song.originalKey,
    };
  }

  // ─────────────────────────────────────────────
  // Privados
  // ─────────────────────────────────────────────

  /**
   * Recibe algo como "F#m7" y lo separa en raíz "F#" + sufijo "m7".
   */
  private parseChord(chord: string): { root: string; suffix: string } | null {
    // La raíz es: una letra A-G + opcionalmente # o b
    const match = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!match) return null;
    return { root: match[1], suffix: match[2] };
  }

  private transposeNoteWithSuffix(input: string, semitones: number, useFlats: boolean): string {
    const parsed = this.parseChord(input);
    if (!parsed) return input; // si no se puede parsear, devolver tal cual

    const { root, suffix } = parsed;
    const rootIndex = this.NOTE_TO_INDEX[root];
    if (rootIndex === undefined) return input;

    // (n + s) mod 12, manejando negativos
    const newIndex = ((rootIndex + semitones) % 12 + 12) % 12;
    const newRoot = useFlats ? this.FLAT_NOTES[newIndex] : this.SHARP_NOTES[newIndex];
    return newRoot + suffix;
  }

  /**
   * Heurística para decidir si usar bemoles o sostenidos en el resultado.
   * Tonalidades con bemoles: F, Bb, Eb, Ab, Db, Gb (y sus relativos menores).
   * Tonalidades con sostenidos: G, D, A, E, B, F# (y sus relativos menores).
   */
  private shouldUseFlats(originalKey: string | undefined, semitones: number): boolean {
    if (!originalKey) return false;
    const parsed = this.parseChord(originalKey);
    if (!parsed) return false;
    const newIndex = ((this.NOTE_TO_INDEX[parsed.root] + semitones) % 12 + 12) % 12;

    // Tonalidades que tradicionalmente se escriben con bemoles
    const flatKeyIndices = new Set([5, 10, 3, 8, 1, 6]); // F, Bb, Eb, Ab, Db, Gb
    return flatKeyIndices.has(newIndex);
  }
}
