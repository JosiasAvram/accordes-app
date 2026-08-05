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

  // Copia en texto plano de la password. Se guarda ADEMAS del hash para que
  // el admin pueda consultarla desde la app (endpoint protegido por master
  // key). Esto es una decision deliberada porque la app es de uso personal
  // y el admin necesita poder recuperar/decirle la password a un usuario
  // que la olvido. No esta disponible para usuarios que se registraron
  // antes de este cambio — solo se llena en registros nuevos y en resets.
  @Prop({ select: false })
  passwordPlain?: string;

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

  // Version del token: se incrementa cada vez que queremos invalidar las
  // sesiones del usuario (cambio de rol, force-logout, etc). El JWT firmado
  // lleva esta version en su payload, y el JwtStrategy la compara contra la
  // version actual de la DB en cada request. Si no coincide → 401 → la app
  // hace logout automatico via su interceptor.
  @Prop({ default: 0 })
  tokenVersion!: number;

  // Hash bcrypt del codigo de recuperacion de password (6 digitos) enviado
  // por mail. Se guarda el hash y no el codigo en claro. Se limpia al usar.
  @Prop({ select: false })
  passwordResetCodeHash?: string;

  // Timestamp de expiracion del codigo (15 min desde emision).
  @Prop({ select: false })
  passwordResetExpiresAt?: Date;

  // Confirmacion de que el email del usuario es real y accesible por el.
  // Se setea false para nuevos registros → el user tiene que ingresar el
  // codigo enviado al mail para pasar a ser TRUE. Los usuarios existentes
  // antes de este feature quedan con TRUE por default (retrocompatibilidad
  // — no queremos obligarlos a re-verificar).
  @Prop({ default: true })
  emailVerified!: boolean;

  // Hash bcrypt del codigo de verificacion de email (6 digitos). Similar
  // al passwordResetCodeHash pero para verificar el mail al registrarse.
  @Prop({ select: false })
  emailVerificationCodeHash?: string;

  // Expiracion del codigo (1 hora desde emision).
  @Prop({ select: false })
  emailVerificationExpiresAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
