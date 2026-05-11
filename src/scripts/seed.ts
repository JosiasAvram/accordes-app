/**
 * Script de seed inicial:
 *  - Crea la cuenta admin (lee credenciales de .env)
 *  - Precarga acordes de guitarra con multiples voicings (posiciones)
 *
 * Uso:
 *   npm run seed
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Chord } from '../chords/schemas/chord.schema';
import { Model } from 'mongoose';

interface VoicingDef {
  label?: string;
  frets: number[];
  fingers?: number[];
  baseFret?: number;
  isBarre?: boolean;
  difficulty?: 'principiante' | 'intermedio' | 'avanzado';
}

interface ChordDef {
  name: string;
  category: 'mayor' | 'menor' | 'septima' | 'sus' | 'dim' | 'aug' | 'otro';
  voicings: VoicingDef[];
}

// Diagrama de acordes de guitarra. Cada uno tiene multiples voicings/posiciones
// para que el usuario pueda navegar con flechas en el modal del acorde.
// Notacion: frets[0]..frets[5] = cuerdas Mi6 → Mi1 (grave a aguda).
//   -1 = cuerda silenciada, 0 = al aire, 1+ = traste.
const GUITAR_CHORDS: ChordDef[] = [
  // ─── Mayores ───────────────────────────────────────────────────
  {
    name: 'C',
    category: 'mayor',
    voicings: [
      { label: 'Abierto', frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], difficulty: 'principiante' },
      { label: 'Cejilla 3°', frets: [-1, 3, 5, 5, 5, 3], fingers: [0, 1, 2, 3, 4, 1], baseFret: 3, isBarre: true, difficulty: 'intermedio' },
      { label: 'Cejilla 8°', frets: [8, 10, 10, 9, 8, 8], fingers: [1, 3, 4, 2, 1, 1], baseFret: 8, isBarre: true, difficulty: 'avanzado' },
    ],
  },
  {
    name: 'D',
    category: 'mayor',
    voicings: [
      { label: 'Abierto', frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], difficulty: 'principiante' },
      { label: 'Cejilla 5°', frets: [5, 5, 7, 7, 7, 5], fingers: [1, 1, 2, 3, 4, 1], baseFret: 5, isBarre: true, difficulty: 'intermedio' },
      { label: 'Cejilla 10°', frets: [10, 12, 12, 11, 10, 10], fingers: [1, 3, 4, 2, 1, 1], baseFret: 10, isBarre: true, difficulty: 'avanzado' },
    ],
  },
  {
    name: 'E',
    category: 'mayor',
    voicings: [
      { label: 'Abierto', frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], difficulty: 'principiante' },
      { label: 'Cejilla 7°', frets: [7, 7, 9, 9, 9, 7], fingers: [1, 1, 2, 3, 4, 1], baseFret: 7, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  {
    name: 'F',
    category: 'mayor',
    voicings: [
      { label: 'Cejilla 1°', frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1, isBarre: true, difficulty: 'intermedio' },
      { label: 'Triada', frets: [-1, -1, 3, 2, 1, 1], fingers: [0, 0, 3, 2, 1, 1], difficulty: 'intermedio' },
      { label: 'Cejilla 8°', frets: [-1, 8, 10, 10, 10, 8], fingers: [0, 1, 2, 3, 4, 1], baseFret: 8, isBarre: true, difficulty: 'avanzado' },
    ],
  },
  {
    name: 'G',
    category: 'mayor',
    voicings: [
      { label: 'Abierto', frets: [3, 2, 0, 0, 0, 3], fingers: [3, 2, 0, 0, 0, 4], difficulty: 'principiante' },
      { label: 'Abierto (alt)', frets: [3, 2, 0, 0, 3, 3], fingers: [2, 1, 0, 0, 3, 4], difficulty: 'principiante' },
      { label: 'Cejilla 3°', frets: [3, 5, 5, 4, 3, 3], fingers: [1, 3, 4, 2, 1, 1], baseFret: 3, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  {
    name: 'A',
    category: 'mayor',
    voicings: [
      { label: 'Abierto', frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], difficulty: 'principiante' },
      { label: 'Cejilla 5°', frets: [5, 7, 7, 6, 5, 5], fingers: [1, 3, 4, 2, 1, 1], baseFret: 5, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  {
    name: 'B',
    category: 'mayor',
    voicings: [
      { label: 'Cejilla 2°', frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], baseFret: 2, isBarre: true, difficulty: 'intermedio' },
      { label: 'Cejilla 7°', frets: [7, 9, 9, 8, 7, 7], fingers: [1, 3, 4, 2, 1, 1], baseFret: 7, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  // ─── Menores ───────────────────────────────────────────────────
  {
    name: 'Am',
    category: 'menor',
    voicings: [
      { label: 'Abierto', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], difficulty: 'principiante' },
      { label: 'Cejilla 5°', frets: [5, 7, 7, 5, 5, 5], fingers: [1, 3, 4, 1, 1, 1], baseFret: 5, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  {
    name: 'Dm',
    category: 'menor',
    voicings: [
      { label: 'Abierto', frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], difficulty: 'principiante' },
      { label: 'Cejilla 5°', frets: [5, 5, 7, 7, 6, 5], fingers: [1, 1, 3, 4, 2, 1], baseFret: 5, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  {
    name: 'Em',
    category: 'menor',
    voicings: [
      { label: 'Abierto', frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], difficulty: 'principiante' },
      { label: 'Cejilla 7°', frets: [7, 7, 9, 9, 8, 7], fingers: [1, 1, 3, 4, 2, 1], baseFret: 7, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  {
    name: 'Fm',
    category: 'menor',
    voicings: [
      { label: 'Cejilla 1°', frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], baseFret: 1, isBarre: true, difficulty: 'intermedio' },
      { label: 'Cejilla 8°', frets: [-1, 8, 10, 10, 9, 8], fingers: [0, 1, 3, 4, 2, 1], baseFret: 8, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  {
    name: 'Gm',
    category: 'menor',
    voicings: [
      { label: 'Cejilla 3°', frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], baseFret: 3, isBarre: true, difficulty: 'intermedio' },
      { label: 'Cejilla 10°', frets: [10, 10, 12, 12, 11, 10], fingers: [1, 1, 3, 4, 2, 1], baseFret: 10, isBarre: true, difficulty: 'avanzado' },
    ],
  },
  {
    name: 'Bm',
    category: 'menor',
    voicings: [
      { label: 'Cejilla 2°', frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], baseFret: 2, isBarre: true, difficulty: 'intermedio' },
      { label: 'Cejilla 7°', frets: [7, 9, 9, 7, 7, 7], fingers: [1, 3, 4, 1, 1, 1], baseFret: 7, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  // ─── Septimas ──────────────────────────────────────────────────
  {
    name: 'C7',
    category: 'septima',
    voicings: [
      { label: 'Abierto', frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0], difficulty: 'intermedio' },
      { label: 'Cejilla 3°', frets: [-1, 3, 5, 3, 5, 3], fingers: [0, 1, 3, 1, 4, 1], baseFret: 3, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  {
    name: 'D7',
    category: 'septima',
    voicings: [
      { label: 'Abierto', frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], difficulty: 'principiante' },
      { label: 'Cejilla 5°', frets: [-1, 5, 7, 5, 7, 5], fingers: [0, 1, 3, 1, 4, 1], baseFret: 5, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  {
    name: 'E7',
    category: 'septima',
    voicings: [
      { label: 'Abierto', frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], difficulty: 'principiante' },
      { label: 'Abierto (alt)', frets: [0, 2, 2, 1, 3, 0], fingers: [0, 2, 3, 1, 4, 0], difficulty: 'intermedio' },
    ],
  },
  {
    name: 'G7',
    category: 'septima',
    voicings: [
      { label: 'Abierto', frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], difficulty: 'principiante' },
      { label: 'Cejilla 3°', frets: [3, 5, 3, 4, 3, 3], fingers: [1, 3, 1, 2, 1, 1], baseFret: 3, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  {
    name: 'A7',
    category: 'septima',
    voicings: [
      { label: 'Abierto', frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], difficulty: 'principiante' },
      { label: 'Cejilla 5°', frets: [5, 7, 5, 6, 5, 5], fingers: [1, 3, 1, 2, 1, 1], baseFret: 5, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  {
    name: 'B7',
    category: 'septima',
    voicings: [
      { label: 'Abierto', frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], difficulty: 'intermedio' },
      { label: 'Cejilla 7°', frets: [7, 9, 7, 8, 7, 7], fingers: [1, 3, 1, 2, 1, 1], baseFret: 7, isBarre: true, difficulty: 'intermedio' },
    ],
  },
  // ─── Suspendidos comunes ────────────────────────────────────────
  {
    name: 'Csus4',
    category: 'sus',
    voicings: [
      { label: 'Abierto', frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 2], difficulty: 'intermedio' },
    ],
  },
  {
    name: 'Dsus4',
    category: 'sus',
    voicings: [
      { label: 'Abierto', frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4], difficulty: 'principiante' },
    ],
  },
  {
    name: 'Asus4',
    category: 'sus',
    voicings: [
      { label: 'Abierto', frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0], difficulty: 'principiante' },
    ],
  },
  {
    name: 'Esus4',
    category: 'sus',
    voicings: [
      { label: 'Abierto', frets: [0, 2, 2, 2, 0, 0], fingers: [0, 1, 2, 3, 0, 0], difficulty: 'principiante' },
    ],
  },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const config = app.get(ConfigService);
  const chordModel = app.get<Model<Chord>>(getModelToken(Chord.name));

  // 1) Admin
  const adminEmail = config.get<string>('ADMIN_EMAIL') ?? 'admin@acordes-app.com';
  const adminPassword = config.get<string>('ADMIN_PASSWORD') ?? 'cambiar-en-primer-login';
  const adminName = config.get<string>('ADMIN_NAME') ?? 'Admin';

  const existingAdmin = await usersService.findByEmail(adminEmail);
  if (!existingAdmin) {
    await usersService.create({
      email: adminEmail,
      password: adminPassword,
      name: adminName,
      role: 'admin',
    });
    console.log(`OK Admin creado: ${adminEmail}`);
  } else {
    console.log(`ya existe Admin: ${adminEmail}`);
  }

  // 2) Acordes con voicings — UPSERT (actualiza si ya existe, crea si no)
  for (const chord of GUITAR_CHORDS) {
    const result = await chordModel.findOneAndUpdate(
      { name: chord.name, instrument: 'guitar' },
      {
        $set: {
          name: chord.name,
          instrument: 'guitar',
          category: chord.category,
          voicings: chord.voicings.map((v) => ({
            label: v.label,
            frets: v.frets,
            fingers: v.fingers ?? [],
            baseFret: v.baseFret ?? 1,
            isBarre: v.isBarre ?? false,
            difficulty: v.difficulty ?? 'principiante',
          })),
        },
      },
      { upsert: true, new: true },
    );
    console.log(`OK ${chord.name} (${result.voicings.length} voicings)`);
  }

  console.log('Seed completo');
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
