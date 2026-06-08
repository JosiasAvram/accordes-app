import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Reunion, ReunionSchema } from './schemas/reunion.schema';
import { ReunionService } from './reunion.service';
import { ReunionController } from './reunion.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reunion.name, schema: ReunionSchema }]),
    NotificationsModule,
  ],
  controllers: [ReunionController],
  providers: [ReunionService],
})
export class ReunionModule {}
