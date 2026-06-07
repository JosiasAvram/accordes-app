import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User, UserDocument } from './schemas/user.schema';

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
}
