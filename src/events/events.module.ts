import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { EventEntity, EventSchema } from './schemas/event.schema';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EventEntity.name, schema: EventSchema }]),
    NotificationsModule,
    UsersModule, // reutilizamos el modelo de User para calcular pendientes
  ],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
