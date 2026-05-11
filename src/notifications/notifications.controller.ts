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
      'Envia una notificacion a todos los dispositivos con el mensaje custom (max 50 chars)',
  })
  send(@Body() dto: SendNotificationDto) {
    return this.notificationsService.sendToAll('Lista actualizada', dto.message);
  }

  @Post('dismiss')
  @ApiOperation({
    summary:
      'Descarta el "boton notificar" sin enviar push (solo actualiza lastNotificationAction)',
  })
  async dismiss() {
    await this.notificationsService.markNotificationAction();
    return { ok: true };
  }
}
