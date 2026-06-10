import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import { User, UserDocument } from './schemas/user.schema';

interface CreateUserInput {
  username: string;
  password: string;
  name: string;
  lastName?: string;
  email?: string;
  instrument?: 'guitarra' | 'bajo' | 'piano' | 'voz' | 'bateria';
  role?: 'admin' | 'contributor' | 'user' | 'miembro' | 'lider' | 'none';
}

// Tipo público de usuario (sin password hash).
export interface SafeUser {
  _id: unknown;
  username: string;
  email?: string;
  name: string;
  lastName?: string;
  instrument?: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username: username.toLowerCase() }).exec();
  }

  async findById(id: string): Promise<SafeUser> {
    const user = await this.userModel.findById(id).lean().exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const { passwordHash, ...rest } = user;
    return rest as SafeUser;
  }

  async create(input: CreateUserInput): Promise<SafeUser> {
    // Si el username ya existe, lanzamos error para que el controller responda
    // con un mensaje claro.
    const existing = await this.findByUsername(input.username);
    if (existing) {
      throw new Error(`El usuario "${input.username}" ya existe`);
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const created = await this.userModel.create({
      username: input.username.toLowerCase(),
      passwordHash,
      name: input.name,
      lastName: input.lastName,
      email: input.email?.toLowerCase(),
      instrument: input.instrument,
      role: input.role ?? 'miembro',
    });
    const obj = created.toObject();
    const { passwordHash: _, ...rest } = obj;
    return rest as SafeUser;
  }

  async validatePassword(username: string, password: string): Promise<UserDocument | null> {
    const user = await this.findByUsername(username);
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    return user;
  }
}
