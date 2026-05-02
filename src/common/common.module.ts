import { Global, Module } from '@nestjs/common';
import { TransposerService } from './services/transposer.service';
import { ChordParserService } from './services/chord-parser.service';

@Global()
@Module({
  providers: [TransposerService, ChordParserService],
  exports: [TransposerService, ChordParserService],
})
export class CommonModule {}
