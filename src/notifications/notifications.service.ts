import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

import { PushToken, PushTokenDocument } from './schemas/push-token.schema';
import { AppState, AppStateDocument } from './schemas/app-state.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo();

  constructor(
    @InjectModel(PushToken.name) private readonly tokenModel: Model<PushTokenDocument>,
    @InjectModel(AppState.name) private readonly stateModel: Model<AppStateDocument>,
  ) {}

  // ── Tokens ──────────────────────────────────────────

  async registerToken(token: string, platform: string, deviceId?: string) {
    if (!Expo.isExpoPushToken(token)) {
      throw new Error('Token de push invalido (no es un Expo push token)');
    }
    // Upsert: si ya existe el mismo token, actualizamos. Si hay otro token
    // con el mismo deviceId, lo reemplazamos.
    if (deviceId) {
      await this.tokenModel.deleteMany({ deviceId, token: { $ne: token } });
    }
    const updated = await this.tokenModel
      .findOneAndUpdate(
        { token },
        { token, platform, deviceId, active: true },
        { upsert: true, new: true },
      )
      .lean()
      .exec();
    return { _id: updated._id, token: updated.token };
  }

  async unregisterToken(token: string) {
    await this.tokenModel.deleteOne({ token }).exec();
    return { ok: true };
  }

  // ── Estado global de la lista ───────────────────────

  async getState() {
    const state = await this.ensureState();
    return {
      lastListChange: state.lastListChange,
      lastNotificationAction: state.lastNotificationAction,
    };
  }

  async markListChanged() {
    await this.ensureState();
    await this.stateModel
      .updateOne({ key: 'global' }, { lastListChange: new Date() })
      .exec();
  }

  async markNotificationAction() {
    await this.ensureState();
    await this.stateModel
      .updateOne({ key: 'global' }, { lastNotificationAction: new Date() })
      .exec();
  }

  // ── Envio de notificaciones ─────────────────────────

  /**
   * Manda una notificacion push a TODOS los dispositivos registrados (broadcast).
   * Despues de enviar, actualiza lastNotificationAction.
   */
  async sendToAll(title: string, body: string) {
    const tokens = await this.tokenModel.find({ active: true }).lean().exec();
    if (tokens.length === 0) {
      this.logger.warn('No hay tokens registrados, salteando push');
      await this.markNotificationAction();
      return { sent: 0 };
    }

    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        sound: 'default',
        title,
        body,
        data: { type: 'list-updated' },
      }));

    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];
    for (const chunk of chunks) {
      try {
        const chunkTickets = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...chunkTickets);
      } catch (err) {
        this.logger.error('Error mandando chunk de push:', err);
      }
    }

    // Limpiar tokens que dieron error de tipo "DeviceNotRegistered"
    const invalidTokens: string[] = [];
    tickets.forEach((ticket, i) => {
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        invalidTokens.push(messages[i].to as string);
      }
    });
    if (invalidTokens.length > 0) {
      await this.tokenModel
        .updateMany({ token: { $in: invalidTokens } }, { active: false })
        .exec();
      this.logger.log(`Desactivados ${invalidTokens.length} tokens invalidos`);
    }

    await this.markNotificationAction();
    return { sent: messages.length, invalid: invalidTokens.length };
  }

  // ── Helpers ─────────────────────────────────────────

  private async ensureState(): Promise<AppStateDocument> {
    let state = await this.stateModel.findOne({ key: 'global' }).exec();
    if (!state) {
      state = await this.stateModel.create({ key: 'global' });
    }
    return state;
  }
}
