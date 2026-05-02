/**
 * Script para importar canciones masivamente desde archivos .txt o .json.
 *
 * Uso:
 *   npm run import-songs -- ./ruta/a/carpeta/
 *
 * El script recorre la carpeta, parsea cada archivo y los carga en la base
 * directamente (sin pasar por HTTP, así es más rápido y no necesita login).
 *
 * Archivos soportados:
 *   - .txt → formato "ChordOver" (header + secciones [...] + acordes/letra)
 *   - .json → JSON con la estructura del modelo Song
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SongsService } from '../songs/songs.service';
import { ChordParserService } from '../common/services/chord-parser.service';

interface SongHeader {
  title?: string;
  artist?: string;
  genre?: string;
  key?: string;
  capo?: number;
  difficulty?: string;
}

function parseHeaderAndBody(input: string): { header: SongHeader; body: string } {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const header: SongHeader = {};
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Cortar header: cuando encontramos primera línea con [Sección] o línea vacía después de header válido
    const headerMatch = line.match(/^(Title|Artist|Genre|Key|Capo|Difficulty)\s*:\s*(.+)$/i);
    if (headerMatch) {
      const key = headerMatch[1].toLowerCase() as keyof SongHeader;
      const value = headerMatch[2].trim();
      if (key === 'capo') {
        (header as Record<string, unknown>)[key] = Number(value) || 0;
      } else {
        (header as Record<string, unknown>)[key] = value;
      }
      bodyStart = i + 1;
      continue;
    }
    if (line.match(/^\s*\[.+\]\s*$/)) {
      bodyStart = i;
      break;
    }
    if (line.trim() === '' && Object.keys(header).length > 0) {
      bodyStart = i + 1;
      break;
    }
  }

  return {
    header,
    body: lines.slice(bodyStart).join('\n'),
  };
}

async function processFile(
  filePath: string,
  songsService: SongsService,
  parser: ChordParserService,
): Promise<{ ok: boolean; message: string }> {
  const content = fs.readFileSync(filePath, 'utf8');
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.json') {
      const data = JSON.parse(content);
      // Sacar campos auxiliares que empiezan con _
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(([k]) => !k.startsWith('_')),
      ) as unknown as Parameters<SongsService['create']>[0];
      const created = await songsService.create(cleaned);
      return { ok: true, message: `✅ ${created.title} — ${created.artist}` };
    }

    if (ext === '.txt') {
      const { header, body } = parseHeaderAndBody(content);
      if (!header.title || !header.artist) {
        return {
          ok: false,
          message: `❌ ${path.basename(filePath)}: faltan Title o Artist en el header`,
        };
      }
      const sections = parser.parse(body);

      const created = await songsService.create({
        title: header.title,
        artist: header.artist,
        genre: header.genre?.toLowerCase(),
        originalKey: header.key ?? 'C',
        capo: header.capo ?? 0,
        difficulty: (header.difficulty as 'principiante' | 'intermedio' | 'avanzado') ?? 'intermedio',
        sections: sections as Parameters<SongsService['create']>[0]['sections'],
        status: 'published',
      });
      return { ok: true, message: `✅ ${created.title} — ${created.artist}` };
    }

    return { ok: false, message: `⏭️  ${path.basename(filePath)}: extensión no soportada` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `❌ ${path.basename(filePath)}: ${message}` };
  }
}

async function bootstrap() {
  const folder = process.argv[2];
  if (!folder) {
    console.error('Uso: npm run import-songs -- ./ruta/a/carpeta/');
    process.exit(1);
  }
  if (!fs.existsSync(folder)) {
    console.error(`No existe la carpeta: ${folder}`);
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const songsService = app.get(SongsService);
  const parser = app.get(ChordParserService);

  const files = fs
    .readdirSync(folder)
    .filter((f) => f.endsWith('.txt') || f.endsWith('.json'))
    .map((f) => path.join(folder, f));

  console.log(`📁 Procesando ${files.length} archivo(s) en ${folder}\n`);

  let ok = 0;
  let fail = 0;
  for (const file of files) {
    const result = await processFile(file, songsService, parser);
    console.log(result.message);
    if (result.ok) ok++;
    else fail++;
  }

  console.log(`\n📊 Resultado: ${ok} OK / ${fail} fallidos / ${files.length} total`);
  await app.close();
  process.exit(fail > 0 ? 1 : 0);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
