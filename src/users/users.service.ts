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

  /**
   * Busca un usuario por username O por email. Se usa en el flujo "olvide
   * mi contraseña" — el user puede escribir cualquiera de los dos.
   */
  async findByUsernameOrEmail(identifier: string): Promise<UserDocument | null> {
    const value = identifier.trim().toLowerCase();
    return this.userModel
      .findOne({ $or: [{ username: value }, { email: value }] })
      .select('+passwordResetCodeHash +passwordResetExpiresAt')
      .exec();
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

  /**
   * Guarda el hash del codigo de recuperacion + expiracion (15 min).
   */
  async setPasswordResetCode(id: string, codeHash: string): Promise<void> {
    const expires = new Date(Date.now() + 15 * 60 * 1000);
    await this.userModel
      .updateOne(
        { _id: id },
        { $set: { passwordResetCodeHash: codeHash, passwordResetExpiresAt: expires } },
      )
      .exec();
  }

  /**
   * Limpia el codigo de recuperacion (tras uso exitoso o expiracion).
   */
  async clearPasswordResetCode(id: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: id },
        { $unset: { passwordResetCodeHash: '', passwordResetExpiresAt: '' } },
      )
      .exec();
  }

  /**
   * Actualiza el email de un usuario. Valida formato basico y unicidad.
   */
  async updateEmail(id: string, newEmail: string): Promise<void> {
    const email = newEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Email inválido.');
    }
    // Chequeamos que no lo tenga ya otro usuario
    const existing = await this.userModel.findOne({ email, _id: { $ne: id } }).exec();
    if (existing) {
      throw new Error('Ese email ya está en uso por otro usuario.');
    }
    const result = await this.userModel.updateOne({ _id: id }, { $set: { email } }).exec();
    if (result.matchedCount === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }

  /**
   * Cambia la password validando la password actual del usuario.
   * Se usa en la pantalla "Cambiar contraseña" (user logueado).
   */
  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<void> {
    if (!newPassword || newPassword.length < 4) {
      throw new Error('La nueva contraseña debe tener al menos 4 caracteres.');
    }
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Usuario no encontrado');
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw new Error('La contraseña actual no es correcta.');
    await this.resetPassword(id, newPassword);
  }
}
