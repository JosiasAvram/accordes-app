import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Logger,
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
import { MailService } from '../mail/mail.service';

const VALID_ROLES = ['admin', 'lider', 'miembro', 'contributor', 'user', 'none'] as const;
type Role = (typeof VALID_ROLES)[number];

// Master key para desbloquear el endpoint de "Ver contraseñas". Se puede
// sobreescribir por env var ADMIN_MASTER_KEY. Default: la que definio el
// dueño de la app.
const ADMIN_MASTER_KEY = process.env.ADMIN_MASTER_KEY ?? '35531716';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
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
      .select('username email name lastName instrument role emailVerified')
      .sort({ name: 1 })
      .lean()
      .exec();
    return users.map((u) => ({
      id: (u._id as { toString(): string }).toString(),
      username: u.username,
      email: u.email,
      name: u.name,
      lastName: u.lastName,
      instrument: u.instrument,
      role: u.role,
      emailVerified: u.emailVerified ?? true,
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
    // Antes de cambiar el rol, verificar que el user haya confirmado su mail.
    // Un user con emailVerified=false no puede pasar de 'none' porque:
    //   - Podria no ser el dueño real de ese mail (typo).
    //   - Si el admin lo aprueba y despues no puede recuperar la contraseña,
    //     queda bloqueado.
    // Excepcion: siempre podemos poner en 'none' (por si un admin quiere revocar).
    const target = await this.userModel.findById(id).select('emailVerified role email name').exec();
    if (!target) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (!target.emailVerified && body.role !== 'none') {
      throw new BadRequestException(
        'Este usuario todavía no verificó su email. Pedile que ingrese el código que le llegó al correo antes de aprobarlo.',
      );
    }

    // Setea el nuevo rol Y bumpea tokenVersion en la misma operacion para
    // invalidar las sesiones del usuario al instante.
    // Usamos findOneAndUpdate con new:false para recuperar el rol/email
    // previos y poder mandar el mail apropiado sin hacer una query extra.
    const previous = await this.userModel
      .findOneAndUpdate(
        { _id: id },
        { $set: { role: body.role }, $inc: { tokenVersion: 1 } },
        { new: false },
      )
      .exec();
    if (!previous) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Notificar por mail — mejor esfuerzo, no bloquea la operacion si falla.
    // Solo si el rol realmente cambio (no vale la pena si el admin hizo
    // "cambiar" al mismo rol por error).
    if (previous.email && previous.role !== body.role) {
      try {
        await this.mailService.sendRoleChangeAlert(
          previous.email,
          previous.name,
          previous.role,
          body.role,
        );
      } catch (err) {
        this.logger.warn(`No se pudo enviar mail de cambio de rol: ${err instanceof Error ? err.message : err}`);
      }
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

  @Patch('me/email')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualiza el email del usuario logueado.' })
  async updateMyEmail(
    @Body() body: { email: string },
    @Req() req: { user: { sub: string } },
  ) {
    if (!body?.email) {
      throw new BadRequestException('Falta el email.');
    }
    try {
      await this.usersService.updateEmail(req.user.sub, body.email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo actualizar el email.';
      throw new BadRequestException(msg);
    }
    return { ok: true, email: body.email.trim().toLowerCase() };
  }
}
