import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User, UserDocument } from './schemas/user.schema';

const VALID_ROLES = ['admin', 'lider', 'miembro', 'contributor', 'user'] as const;
type Role = (typeof VALID_ROLES)[number];

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
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
    if (req.user.sub === id && body.role !== 'admin') {
      throw new BadRequestException('No podés cambiar tu propio rol de admin.');
    }
    const result = await this.userModel
      .updateOne({ _id: id }, { $set: { role: body.role } })
      .exec();
    if (result.matchedCount === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return { ok: true, role: body.role };
  }
}
