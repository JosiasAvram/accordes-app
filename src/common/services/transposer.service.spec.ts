import { TransposerService } from './transposer.service';

describe('TransposerService', () => {
  const service = new TransposerService();

  describe('transposeChord', () => {
    it('devuelve el mismo acorde si semitones=0', () => {
      expect(service.transposeChord('C', 0)).toBe('C');
      expect(service.transposeChord('Am', 0)).toBe('Am');
    });

    it('sube acordes mayores 1 semitono', () => {
      expect(service.transposeChord('C', 1)).toBe('C#');
      expect(service.transposeChord('G', 1)).toBe('G#');
    });

    it('baja acordes 1 semitono', () => {
      expect(service.transposeChord('D', -1)).toBe('C#');
      expect(service.transposeChord('A', -1)).toBe('G#');
    });

    it('mantiene los sufijos', () => {
      expect(service.transposeChord('Am', 2)).toBe('Bm');
      expect(service.transposeChord('F#m7', -1)).toBe('Fm7');
      expect(service.transposeChord('Cmaj7', 5)).toBe('Fmaj7');
      expect(service.transposeChord('Dsus4', 7)).toBe('Asus4');
    });

    it('maneja acordes con bajo (slash chords)', () => {
      expect(service.transposeChord('C/G', 5)).toBe('F/C');
      expect(service.transposeChord('Am/E', 2)).toBe('Bm/F#');
    });

    it('envuelve correctamente con módulo 12', () => {
      expect(service.transposeChord('B', 1)).toBe('C');
      expect(service.transposeChord('C', -1)).toBe('B');
      expect(service.transposeChord('A', 12)).toBe('A'); // ciclo completo
    });

    it('usa bemoles cuando se indica', () => {
      expect(service.transposeChord('C', 1, true)).toBe('Db');
      expect(service.transposeChord('G', 1, true)).toBe('Ab');
    });
  });

  describe('transposeSong', () => {
    it('transpone todos los acordes de la canción', () => {
      const song = {
        originalKey: 'C',
        sections: [
          {
            lines: [
              {
                chords: [
                  { chord: 'C', position: 0 },
                  { chord: 'G', position: 10 },
                  { chord: 'Am', position: 20 },
                  { chord: 'F', position: 30 },
                ],
              },
            ],
          },
        ],
      };

      const result = service.transposeSong(song, 2);
      expect(result.originalKey).toBe('D');
      expect(result.sections[0].lines[0].chords).toEqual([
        { chord: 'D', position: 0 },
        { chord: 'A', position: 10 },
        { chord: 'Bm', position: 20 },
        { chord: 'G', position: 30 },
      ]);
    });

    it('no muta el objeto original', () => {
      const song = {
        originalKey: 'G',
        sections: [{ lines: [{ chords: [{ chord: 'G', position: 0 }] }] }],
      };
      service.transposeSong(song, 2);
      expect(song.originalKey).toBe('G');
      expect(song.sections[0].lines[0].chords[0].chord).toBe('G');
    });
  });
});
