import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.usersService.validatePassword(username, password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return this.buildLoginResponse(user);
  }

  async register(dto: RegisterDto) {
    try {
      const created = await this.usersService.create({
        username: dto.username,
        password: dto.password,
        name: dto.name,
        lastName: dto.lastName,
        email: dto.email,
        instrument: dto.instrument,
        // Los registros desde la app arrancan con rol 'none' = pendiente.
        // El admin debe aprobarlos cambiandoles el rol a miembro/lider/etc.
        role: 'none',
      });
      // Devolvemos también un token, así el usuario queda logueado al instante.
      // tv=0 porque acabamos de crear el usuario (tokenVersion default = 0).
      const payload = {
        sub: (created._id as { toString(): string }).toString(),
        username: created.username,
        role: created.role,
        name: created.name,
        tv: 0,
      };
      // Mail de bienvenida — mejor esfuerzo, no bloquea el registro si falla.
      if (created.email) {
        try {
          await this.mailService.sendWelcomeEmail(created.email, created.name);
        } catch (err) {
          this.logger.warn(`No se pudo enviar mail de bienvenida: ${err instanceof Error ? err.message : err}`);
        }
      }

      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          id: (created._id as { toString(): string }).toString(),
          username: created.username,
          email: created.email,
          name: created.name,
          lastName: created.lastName,
          instrument: created.instrument,
          role: created.role,
        },
        message: 'Usuario registrado con éxito',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al registrar';
      if (msg.includes('ya existe')) {
        throw new ConflictException(msg);
      }
      throw new BadRequestException(msg);
    }
  }

  /**
   * Inicia el flujo "olvide mi contraseña".
   *
   * Comportamiento:
   *  - Si el user no existe: devuelve OK igual (no filtra existencia de cuentas).
   *  - Si existe pero no tiene email cargado: devuelve { hasEmail: false } para
   *    que la app le diga "cargá un email o contactá al admin".
   *  - Si existe con email: genera codigo de 6 digitos, guarda hash + expira 15 min,
   *    envia mail via Brevo. Devuelve el email OFUSCADO (ej: "j***@gmail.com")
   *    asi el user sabe a que casilla mirar.
   */
  async forgotPassword(identifier: string) {
    if (!identifier || identifier.trim().length < 3) {
      throw new BadRequestException('Ingresá tu usuario o email.');
    }
    const user = await this.usersService.findByUsernameOrEmail(identifier);
    // Respuesta neutra si no existe (no filtramos que usernames/emails hay en la DB).
    if (!user) {
      return { ok: true, hasEmail: true, maskedEmail: maskEmail(identifier) };
    }
    if (!user.email) {
      return { ok: true, hasEmail: false };
    }

    const code = generateSixDigitCode();
    const codeHash = await bcrypt.hash(code, 10);
    await this.usersService.setPasswordResetCode(
      (user._id as { toString(): string }).toString(),
      codeHash,
    );

    try {
      await this.mailService.sendPasswordResetCode(user.email, user.name, code);
    } catch (err) {
      // Log ya se hizo en MailService. Al user le decimos que no se pudo.
      throw new BadRequestException(
        'No pudimos enviar el email. Probá de nuevo en un rato o contactá al admin.',
      );
    }

    return { ok: true, hasEmail: true, maskedEmail: maskEmail(user.email) };
  }

  /**
   * Valida el codigo enviado por mail y actualiza la password.
   * Bumpea tokenVersion via resetPassword → todas las sesiones viejas caen.
   */
  async resetPasswordWithCode(identifier: string, code: string, newPassword: string) {
    if (!identifier || !code || !newPassword) {
      throw new BadRequestException('Faltan datos.');
    }
    if (newPassword.length < 4) {
      throw new BadRequestException('La contraseña nueva debe tener al menos 4 caracteres.');
    }
    const user = await this.usersService.findByUsernameOrEmail(identifier);
    if (!user || !user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      throw new BadRequestException('Código inválido o expirado.');
    }
    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      await this.usersService.clearPasswordResetCode(
        (user._id as { toString(): string }).toString(),
      );
      throw new BadRequestException('El código expiró. Pedí uno nuevo.');
    }
    const codeOk = await bcrypt.compare(code.trim(), user.passwordResetCodeHash);
    if (!codeOk) {
      throw new BadRequestException('Código incorrecto.');
    }
    const userId = (user._id as { toString(): string }).toString();
    await this.usersService.resetPassword(userId, newPassword);
    await this.usersService.clearPasswordResetCode(userId);
    return { ok: true };
  }

  private async buildLoginResponse(user: {
    _id: { toString(): string };
    username: string;
    email?: string;
    name: string;
    lastName?: string;
    instrument?: string;
    role: string;
    tokenVersion?: number;
  }) {
    // Incluimos tokenVersion para que el JwtStrategy pueda invalidar
    // tokens viejos cuando el admin desloguea al usuario.
    const payload = {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name,
      tv: user.tokenVersion ?? 0,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        instrument: user.instrument,
        role: user.role,
      },
    };
  }
}

function generateSixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** "juanperez@gmail.com" → "j***@gmail.com" */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const masked = local.length <= 2 ? local[0] + '***' : local[0] + '***' + local.slice(-1);
  return `${masked}@${domain}`;
}
