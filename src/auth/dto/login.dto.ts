import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(3)
  username!: string;

  // MinLength(1) para no rechazar en la validacion del DTO passwords cortas.
  // La real validacion de "es correcta" la hace bcrypt.compare en el service.
  // Si el password es incorrecto → 401 (no 400).
  @ApiProperty({ example: 'admin' })
  @IsString()
  @MinLength(1)
  password!: string;
}
