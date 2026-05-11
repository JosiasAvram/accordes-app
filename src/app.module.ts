import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';

import { SongsModule } from './songs/songs.module';
import { ChordsModule } from './chords/chords.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { GenresModule } from './genres/genres.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
    }),
    // Rate limit global: 60 requests por minuto por IP
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
    AuthModule,
    UsersModule,
    SongsModule,
    ChordsModule,
    GenresModule,
    NotificationsModule,
  ],
})
export class AppModule {}
