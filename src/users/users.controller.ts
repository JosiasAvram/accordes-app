import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User, UserDocument } from './schemas/user.schema';
import { UsersService } from './users.service';

const VALID_ROLES = ['admin', 'lider', 'miembro', 'contributor', 'user', 'none'] as const;
type Role = (typeof VALID_ROLES)[number];

// Master key para desbloquear el endpoint de "Ver contraseñas". Se puede
// sobreescribir por env var ADMIN_MASTER_KEY. Default: la que definio el
// dueño de la app.
const ADMIN_MASTER_KEY = process.env.ADMIN_MASTER_KEY ?? '35531716';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lista todos los usuarios (sin password). Cualquiera con sesión puede.',
  })
  async listAll() {
    const users = await this.userModel
      .find()
      .select('username name lastName instrument role')
      .sort({ name: 1 })
      .lean()
      .exec();
    return users.map((u) => ({
      id: (u._id as { toString(): string }).toString(),
      username: u.username,
      name: u.name,
      lastName: u.lastName,
      instrument: u.instrument,
      role: u.role,
    }));
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambia el rol de un usuario. Solo admin.' })
  async updateRole(
    @Param('id') id: string,
    @Body() body: { role: string },
    @Req() req: { user: { sub?: string; role: string } },
  ) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Solo el admin puede asignar roles.');
    }
    if (!body || typeof body.role !== 'string' || !VALID_ROLES.includes(body.role as Role)) {
      throw new BadRequestException(
        `Rol inválido. Válidos: ${VALID_ROLES.join(', ')}`,
      );
    }
    // No permitir al admin sacarse a sí mismo el rol de admin (evita lockout).
    // Esto cubre tambien el caso de auto-asignarse 'none', que dejaria al
    // admin sin acceso a la pantalla de Roles para revertirlo.
    if (req.user.sub === id && body.role !== 'admin') {
      throw new BadRequestException(
        'No podés sacarte el rol de admin a vos mismo. Pedile a otro admin que lo haga.',
      );
    }
    // Setea el nuevo rol Y bumpea tokenVersion en la misma operacion para
    // invalidar las sesiones del usuario al instante.
    const result = await this.userModel
      .updateOne(
        { _id: id },
        { $set: { role: body.role }, $inc: { tokenVersion: 1 } },
      )
      .exec();
    if (result.matchedCount === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return { ok: true, role: body.role, loggedOut: true };
  }

  @Patch(':id/force-logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cierra todas las sesiones del usuario. Solo admin.' })
  async forceLogout(
    @Param('id') id: string,
    @Req() req: { user: { sub?: string; role: string } },
  ) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Solo el admin puede cerrar sesiones.');
    }
    if (req.user.sub === id) {
      throw new BadRequestException('Para cerrar tu propia sesión usá el botón "Cerrar sesión".');
    }
    const found = await this.userModel.exists({ _id: id });
    if (!found) {
      throw new NotFoundException('Usuario no encontrado');
    }
    await this.usersService.bumpTokenVersion(id);
    return { ok: true, loggedOut: true };
  }

  @Patch(':id/password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resetea la contraseña de un usuario. Solo admin.' })
  async resetPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
    @Req() req: { user: { sub?: string; role: string } },
  ) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Solo el admin puede resetear contraseñas.');
    }
    if (!body || typeof body.password !== 'string' || body.password.length < 4) {
      throw new BadRequestException('La contraseña debe tener al menos 4 caracteres.');
    }
    try {
      await this.usersService.resetPassword(id, body.password);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const msg = err instanceof Error ? err.message : 'No se pudo resetear la contraseña.';
      throw new BadRequestException(msg);
    }
    return { ok: true, loggedOut: true };
  }

  @Post('passwords')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Devuelve el listado de contraseñas de los usuarios (uso admin, protegido por master key en el body).',
  })
  async listPasswords(
    @Body() body: { masterKey: string },
    @Req() req: { user: { role: string } },
  ) {
    if (req.user?.role !== 'admin') {
      throw new ForbiddenException('Solo el admin puede ver las contraseñas.');
    }
    if (!body || body.masterKey !== ADMIN_MASTER_KEY) {
      throw new ForbiddenException('Clave maestra incorrecta.');
    }
    const list = await this.usersService.listWithPasswords();
    return list
      .map((u) => ({
        id: (u._id as { toString(): string }).toString(),
        username: u.username,
        name: u.name,
        lastName: u.lastName,
        role: u.role,
        // undefined si el usuario es previo al feature: el frontend muestra
        // "(sin registro — resetear para verla)".
        password: u.passwordPlain ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
