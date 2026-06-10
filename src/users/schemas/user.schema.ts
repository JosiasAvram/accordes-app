import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  // Username como identificador principal del login (unique, lowercase).
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  username!: string;

  // Email queda opcional — lo conservamos por si lo usamos a futuro para reset
  // de contraseña, etc. NO es el identificador de login.
  @Prop({ lowercase: true, trim: true, sparse: true })
  email?: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  name!: string;

  // Apellido (opcional para el admin seedeado, requerido al registrarse desde la app).
  @Prop({ trim: true })
  lastName?: string;

  // Instrumento que toca el usuario (selector cerrado).
  @Prop({
    enum: ['guitarra', 'bajo', 'piano', 'voz', 'bateria'],
  })
  instrument?: string;

  // Rol 'none' es el ESTADO INICIAL al registrarse: el user no puede usar nada
  // de la app hasta que el admin lo apruebe asignandole otro rol.
  @Prop({
    enum: ['admin', 'contributor', 'user', 'miembro', 'lider', 'none'],
    default: 'none',
    index: true,
  })
  role!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
