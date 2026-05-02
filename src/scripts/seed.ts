/**
 * Script de seed inicial:
 *  - Crea la cuenta admin (lee credenciales de .env)
 *  - Precarga los acordes básicos de guitarra
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

const BASIC_GUITAR_CHORDS = [
  // Acordes mayores
  { name: 'C',  frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], category: 'mayor', difficulty: 'principiante' },
  { name: 'D',  frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], category: 'mayor', difficulty: 'principiante' },
  { name: 'E',  frets: [0, 2, 2, 1, 0, 0],  fingers: [0, 2, 3, 1, 0, 0], category: 'mayor', difficulty: 'principiante' },
  { name: 'F',  frets: [1, 3, 3, 2, 1, 1],  fingers: [1, 3, 4, 2, 1, 1], category: 'mayor', difficulty: 'intermedio', isBarre: true },
  { name: 'G',  frets: [3, 2, 0, 0, 0, 3],  fingers: [3, 2, 0, 0, 0, 4], category: 'mayor', difficulty: 'principiante' },
  { name: 'A',  frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], category: 'mayor', difficulty: 'principiante' },
  { name: 'B',  frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], category: 'mayor', difficulty: 'intermedio', isBarre: true },
  // Acordes menores
  { name: 'Am', frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], category: 'menor', difficulty: 'principiante' },
  { name: 'Dm', frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], category: 'menor', difficulty: 'principiante' },
  { name: 'Em', frets: [0, 2, 2, 0, 0, 0],  fingers: [0, 2, 3, 0, 0, 0], category: 'menor', difficulty: 'principiante' },
  { name: 'Fm', frets: [1, 3, 3, 1, 1, 1],  fingers: [1, 3, 4, 1, 1, 1], category: 'menor', difficulty: 'intermedio', isBarre: true },
  { name: 'Gm', frets: [3, 5, 5, 3, 3, 3],  fingers: [1, 3, 4, 1, 1, 1], category: 'menor', difficulty: 'intermedio', isBarre: true },
  { name: 'Bm', frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], category: 'menor', difficulty: 'intermedio', isBarre: true },
  // Séptimas comunes
  { name: 'C7', frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0], category: 'septima', difficulty: 'intermedio' },
  { name: 'D7', frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], category: 'septima', difficulty: 'principiante' },
  { name: 'E7', frets: [0, 2, 0, 1, 0, 0],  fingers: [0, 2, 0, 1, 0, 0], category: 'septima', difficulty: 'principiante' },
  { name: 'G7', frets: [3, 2, 0, 0, 0, 1],  fingers: [3, 2, 0, 0, 0, 1], category: 'septima', difficulty: 'principiante' },
  { name: 'A7', frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], category: 'septima', difficulty: 'principiante' },
  { name: 'B7', frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], category: 'septima', difficulty: 'intermedio' },
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
    console.log(`✅ Admin creado: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin ya existe: ${adminEmail}`);
  }

  // 2) Acordes básicos
  for (const chord of BASIC_GUITAR_CHORDS) {
    const exists = await chordModel.findOne({ name: chord.name, instrument: 'guitar' });
    if (!exists) {
      await chordModel.create({ ...chord, instrument: 'guitar' });
      console.log(`✅ Acorde creado: ${chord.name}`);
    }
  }

  console.log('🎉 Seed completo');
  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
