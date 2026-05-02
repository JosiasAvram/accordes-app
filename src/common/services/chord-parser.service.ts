import { Injectable } from '@nestjs/common';

interface ParsedLine {
  text: string;
  chords: Array<{ chord: string; position: number }>;
}

interface ParsedSection {
  type: string;
  label?: string;
  lines: ParsedLine[];
}

/**
 * Parser de canciones en formato "ChordOver" — el más común en sitios de
 * letras y acordes. Cada par de líneas funciona así:
 *
 *   C          G        Am
 *   Letra de la canción aquí
 *
 * Donde la primera línea tiene los acordes y la segunda la letra.
 * El parser detecta los acordes por su posición de columna y los empareja
 * con la letra de abajo.
 *
 * También reconoce marcadores de sección como [Verso], [Estribillo], etc.
 */
@Injectable()
export class ChordParserService {
  // Regex: una "palabra" que parece un acorde (A-G, opcional #/b, sufijos comunes, opcional bajo)
  private readonly CHORD_REGEX = /\b([A-G][#b]?(?:m|maj|min|aug|dim|sus)?[0-9]*(?:add[0-9]+)?(?:\/[A-G][#b]?)?)\b/g;

  // Marcadores de sección: [Verso], [Estribillo 1], etc.
  private readonly SECTION_REGEX = /^\s*\[(.+?)\]\s*$/i;

  /**
   * Convierte texto plano en estructura de secciones.
   */
  parse(input: string): ParsedSection[] {
    const lines = input.replace(/\r\n/g, '\n').split('\n');
    const sections: ParsedSection[] = [];
    let currentSection: ParsedSection = { type: 'verso', lines: [] };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // Marcador de sección
      const sectionMatch = line.match(this.SECTION_REGEX);
      if (sectionMatch) {
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        currentSection = this.parseSectionLabel(sectionMatch[1]);
        i++;
        continue;
      }

      // Línea vacía: la pasamos como separador
      if (line.trim() === '') {
        if (currentSection.lines.length > 0) {
          currentSection.lines.push({ text: '', chords: [] });
        }
        i++;
        continue;
      }

      // Si la línea actual es solo acordes y la siguiente es texto, las emparejamos
      if (this.isChordLine(line) && i + 1 < lines.length && !this.isChordLine(lines[i + 1]) && lines[i + 1].trim() !== '') {
        const chords = this.extractChords(line);
        currentSection.lines.push({ text: lines[i + 1], chords });
        i += 2;
        continue;
      }

      // Línea de solo acordes (ej: intro, solo)
      if (this.isChordLine(line)) {
        currentSection.lines.push({
          text: '',
          chords: this.extractChords(line),
        });
        i++;
        continue;
      }

      // Línea de solo letra (sin acordes encima)
      currentSection.lines.push({ text: line, chords: [] });
      i++;
    }

    if (currentSection.lines.length > 0) {
      sections.push(currentSection);
    }

    return sections;
  }

  private parseSectionLabel(raw: string): ParsedSection {
    const lower = raw.toLowerCase().trim();
    const typeMap: Record<string, string> = {
      intro: 'intro',
      verso: 'verso',
      estrofa: 'verso',
      estribillo: 'estribillo',
      coro: 'estribillo',
      chorus: 'estribillo',
      puente: 'puente',
      bridge: 'puente',
      solo: 'solo',
      outro: 'outro',
      final: 'outro',
    };

    let type = 'otro';
    for (const [key, value] of Object.entries(typeMap)) {
      if (lower.startsWith(key)) {
        type = value;
        break;
      }
    }
    return { type, label: raw.trim(), lines: [] };
  }

  /**
   * Una línea se considera "de acordes" si todos sus tokens (separados por
   * espacios) parecen acordes válidos.
   */
  private isChordLine(line: string): boolean {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    return tokens.every((t) => /^[A-G][#b]?[a-zA-Z0-9/#b+]*$/.test(t));
  }

  /**
   * Extrae acordes con su posición exacta de columna.
   */
  private extractChords(line: string): Array<{ chord: string; position: number }> {
    const result: Array<{ chord: string; position: number }> = [];
    const tokens = line.split(/(\s+)/);
    let column = 0;
    for (const token of tokens) {
      if (token.trim() && /^[A-G][#b]?[a-zA-Z0-9/#b+]*$/.test(token)) {
        result.push({ chord: token, position: column });
      }
      column += token.length;
    }
    return result;
  }
}
