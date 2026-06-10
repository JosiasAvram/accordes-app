import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
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
      const payload = {
        sub: (created._id as { toString(): string }).toString(),
        username: created.username,
        role: created.role,
        name: created.name,
      };
      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          id: (created._id as { toString(): string }).toString(),
          username: created.username,
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

  private async buildLoginResponse(user: {
    _id: { toString(): string };
    username: string;
    name: string;
    lastName?: string;
    instrument?: string;
    role: string;
  }) {
    const payload = {
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name,
    };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user._id.toString(),
        username: user.username,
        name: user.name,
        lastName: user.lastName,
        instrument: user.instrument,
        role: user.role,
      },
    };
  }
}
