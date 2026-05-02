import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Chord, ChordSchema } from './schemas/chord.schema';
import { ChordsController } from './chords.controller';
import { ChordsService } from './chords.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chord.name, schema: ChordSchema }]),
  ],
  controllers: [ChordsController],
  providers: [ChordsService],
  exports: [ChordsService],
})
export class ChordsModule {}
