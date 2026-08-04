import { Injectable, Logger } from '@nestjs/common';

/**
 * Servicio de envio de mails via Brevo (API HTTP).
 *
 * Requiere las siguientes env vars en Render:
 *   BREVO_API_KEY     — API key generada en https://app.brevo.com/settings/keys/api
 *   BREVO_SENDER_EMAIL — email del remitente verificado en Brevo
 *   BREVO_SENDER_NAME  — nombre a mostrar (opcional, default: "Letras y Acordes")
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private get apiKey(): string {
    return process.env.BREVO_API_KEY ?? '';
  }

  private get senderEmail(): string {
    return process.env.BREVO_SENDER_EMAIL ?? 'appdeacordes@gmail.com';
  }

  private get senderName(): string {
    return process.env.BREVO_SENDER_NAME ?? 'Letras y Acordes';
  }

  /**
   * Envia el codigo de recuperacion de password.
   * Si Brevo no responde OK, loguea el error y lanza (para que el caller
   * decida si mostrar al usuario un mensaje diferente).
   */
  async sendPasswordResetCode(to: string, name: string, code: string): Promise<void> {
    if (!this.apiKey) {
      this.logger.error('BREVO_API_KEY no configurada. No se puede enviar mail.');
      throw new Error('Servicio de email no configurado.');
    }

    const subject = 'Código para recuperar tu contraseña';
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #FAF3E0; color: #1a1a1a;">
        <h2 style="color: #F59E0B; margin-top: 0;">Hola ${escapeHtml(name)},</h2>
        <p>Alguien (esperemos que hayas sido vos) pidió recuperar la contraseña de tu cuenta en <strong>Letras y Acordes</strong>.</p>
        <p>Tu código de recuperación es:</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #fff; border: 2px dashed #F59E0B; padding: 16px; border-radius: 12px; margin: 20px 0;">
          ${escapeHtml(code)}
        </div>
        <p style="font-size: 13px; color: #555;">Este código vence en <strong>15 minutos</strong>. Volvé a la app, pegalo y elegí una contraseña nueva.</p>
        <p style="font-size: 12px; color: #999; margin-top: 24px;">Si vos no pediste esto, ignorá este mail. Nadie puede acceder a tu cuenta sin este código.</p>
      </div>
    `;
    const textContent = `Hola ${name},\n\nTu código de recuperación de contraseña es: ${code}\n\nEste código vence en 15 minutos.\n\nSi no pediste esto, ignorá este mail.`;

    try {
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { email: this.senderEmail, name: this.senderName },
          to: [{ email: to, name }],
          subject,
          htmlContent,
          textContent,
        }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        this.logger.error(`Brevo respondio ${resp.status}: ${body}`);
        throw new Error(`No se pudo enviar el email (Brevo ${resp.status}).`);
      }
      this.logger.log(`Codigo de reset enviado a ${to}`);
    } catch (err) {
      this.logger.error('Error enviando mail:', err);
      throw err instanceof Error ? err : new Error('Error enviando mail.');
    }
  }
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
