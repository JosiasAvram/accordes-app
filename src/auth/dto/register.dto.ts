import { IsIn, IsOptional, IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const INSTRUMENTS = ['guitarra', 'bajo', 'piano', 'voz', 'bateria'] as const;
export type Instrument = typeof INSTRUMENTS[number];

export class RegisterDto {
  @ApiProperty({ example: 'juan_perez', description: 'Username único (3+ chars, sin espacios)' })
  @IsString()
  @MinLength(3)
  @Matches(/^[a-zA-Z0-9_.-]+$/, {
    message: 'username solo puede contener letras, números, guiones, guión bajo y punto',
  })
  username!: string;

  @ApiProperty({ example: 'mi_password' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  @MinLength(1)
  lastName!: string;

  @ApiProperty({ enum: INSTRUMENTS, example: 'guitarra' })
  @IsIn(INSTRUMENTS as unknown as string[])
  instrument!: Instrument;

  @ApiPropertyOptional({ example: 'juan@example.com' })
  @IsOptional()
  @IsString()
  email?: string;
}
