import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Song, SongSchema } from './schemas/song.schema';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';
import { CommonModule } from '../common/common.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Song.name, schema: SongSchema }]),
    CommonModule,
    NotificationsModule,
  ],
  controllers: [SongsController],
  providers: [SongsService],
  exports: [SongsService],
})
export class SongsModule {}
