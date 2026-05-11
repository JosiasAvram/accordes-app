import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PushToken, PushTokenSchema } from './schemas/push-token.schema';
import { AppState, AppStateSchema } from './schemas/app-state.schema';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PushToken.name, schema: PushTokenSchema },
      { name: AppState.name, schema: AppStateSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
