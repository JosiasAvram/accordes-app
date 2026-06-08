import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { NotificationsService } from './notifications.service';
import {
  RegisterTokenDto,
  SendNotificationDto,
} from './dto/register-token.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ── Tokens (publico — la app registra su token al arrancar) ──

  @Post('register')
  @ApiOperation({ summary: 'Registra un Expo push token de un dispositivo' })
  register(@Body() dto: RegisterTokenDto) {
    return this.notificationsService.registerToken(
      dto.token,
      dto.platform,
      dto.deviceId,
    );
  }

  @Delete('register')
  @ApiOperation({ summary: 'Da de baja un token (al desinstalar la app)' })
  unregister(@Body() body: { token: string }) {
    return this.notificationsService.unregisterToken(body.token);
  }

  // ── Estado global ──────────────────────────────────────────

  @Get('list-state')
  @ApiOperation({
    summary:
      'Devuelve lastListChange y lastNotificationAction para decidir si mostrar el boton "Notificar"',
  })
  state() {
    return this.notificationsService.getState();
  }

  // ── Envio de notificaciones (publico — cualquier dispositivo) ──

  @Post('send')
  @ApiOperation({
    summary:
      'Envia una notificacion de LISTA a todos los dispositivos (max 50 chars).',
  })
  async send(@Body() dto: SendNotificationDto) {
    const result = await this.notificationsService.sendToAll(
      'Lista actualizada',
      dto.message,
      { type: 'list-updated', action: 'open-list' },
    );
    await this.notificationsService.markNotificationAction();
    return result;
  }

  @Post('dismiss')
  @ApiOperation({
    summary: 'Descarta el "boton notificar" de Lista sin enviar push.',
  })
  async dismiss() {
    await this.notificationsService.markNotificationAction();
    return { ok: true };
  }

  // ── Reunion ─────────────────────────────────────────────

  @Post('send-reunion')
  @ApiOperation({
    summary:
      'Envia una notificacion de REUNION a todos los dispositivos (max 50 chars).',
  })
  async sendReunion(@Body() dto: SendNotificationDto) {
    const result = await this.notificationsService.sendToAll(
      'Reunión actualizada',
      dto.message,
      { type: 'reunion-updated', action: 'open-reunion' },
    );
    await this.notificationsService.markReunionNotificationAction();
    return result;
  }

  @Post('dismiss-reunion')
  @ApiOperation({
    summary: 'Descarta el "boton notificar" de Reunion sin enviar push.',
  })
  async dismissReunion() {
    await this.notificationsService.markReunionNotificationAction();
    return { ok: true };
  }
}
