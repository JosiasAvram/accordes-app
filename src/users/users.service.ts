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
      // Guardamos tambien la password en texto plano para que el admin
      // pueda consultarla (ver comentario en el schema).
      passwordPlain: input.password,
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

  /**
   * Devuelve solo la tokenVersion actual del usuario.
   * Query liviano (proyecta solo ese campo) porque se llama en cada request
   * autenticado desde el JwtStrategy.
   */
  async getTokenVersion(id: string): Promise<number | null> {
    const user = await this.userModel
      .findById(id, 'tokenVersion')
      .lean<{ tokenVersion?: number }>()
      .exec();
    if (!user) return null;
    return user.tokenVersion ?? 0;
  }

  /**
   * Incrementa la tokenVersion del usuario → invalida todos sus JWT existentes.
   * El proximo request del cliente recibira 401, y la app hara logout sola.
   */
  async bumpTokenVersion(id: string): Promise<void> {
    await this.userModel.updateOne({ _id: id }, { $inc: { tokenVersion: 1 } }).exec();
  }

  /**
   * Resetea la password de un usuario. Actualiza hash + copia plana, y bumpea
   * tokenVersion para cerrar las sesiones activas del usuario.
   */
  async resetPassword(id: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 4) {
      throw new Error('La contraseña debe tener al menos 4 caracteres.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await this.userModel
      .updateOne(
        { _id: id },
        {
          $set: { passwordHash, passwordPlain: newPassword },
          $inc: { tokenVersion: 1 },
        },
      )
      .exec();
    if (result.matchedCount === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  /**
   * Devuelve todos los usuarios con su password en texto plano (donde este
   * disponible). Solo para uso del admin desde la pantalla "Ver contraseñas".
   * Los usuarios registrados antes del cambio no tendran passwordPlain.
   */
  async listWithPasswords() {
    return this.userModel
      .find({}, 'username name lastName role passwordPlain')
      .select('+passwordPlain')
      .lean()
      .exec();
  }
}
