import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from './schemas/user.schema';

interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'contributor' | 'user';
}

// Tipo público de usuario (sin password hash). Lo usamos como tipo de retorno
// explícito para evitar que TS intente inferir un tipo gigante que no puede
// serializar (los tipos internos de Mongoose son enormes).
export interface SafeUser {
  _id: unknown;
  email: string;
  name: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.userModel.findById(id).lean().exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    // No devolver el hash
    const { passwordHash, ...rest } = user;
    return rest as SafeUser;
  }

  async create(input: CreateUserInput): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const created = await this.userModel.create({
      email: input.email.toLowerCase(),
      passwordHash,
      name: input.name,
      role: input.role ?? 'user',
    });
    const obj = created.toObject();
    const { passwordHash: _, ...rest } = obj;
    return rest as SafeUser;
  }

  async validatePassword(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return user;
  }
}
