import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { EventEntity, EventSchema } from './schemas/event.schema';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EventEntity.name, schema: EventSchema }]),
    NotificationsModule,
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
