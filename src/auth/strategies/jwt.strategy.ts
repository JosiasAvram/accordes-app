import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { UsersService } from '../../users/users.service';

interface JwtPayload {
  sub: string;
  username: string;
  role: string;
  name: string;
  // Version del token en el momento de la firma. Si la version del usuario
  // en la DB avanzo (porque un admin lo deslogueo o le cambio el rol), este
  // token queda invalido.
  tv?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? 'default-secret',
    });
  }

  // Lo que devuelve esto se inyecta en req.user
  async validate(payload: JwtPayload) {
    // Si el payload no trae tv (tokens viejos firmados antes de este cambio),
    // asumimos 0 y le damos compatibilidad.
    const tokenTv = payload.tv ?? 0;
    const currentTv = await this.usersService.getTokenVersion(payload.sub);

    // Usuario fue borrado o no existe → 401
    if (currentTv === null) {
      throw new UnauthorizedException('Sesión inválida');
    }
    // El admin invalido los tokens viejos de este usuario.
    if (tokenTv < currentTv) {
      throw new UnauthorizedException('Tu sesión fue cerrada por el administrador.');
    }

    return {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
      name: payload.name,
    };
  }
}
