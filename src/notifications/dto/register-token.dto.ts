import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterTokenDto {
  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  token!: string;

  @ApiProperty({ enum: ['ios', 'android', 'web'], example: 'android' })
  @IsEnum(['ios', 'android', 'web'])
  platform!: string;

  @ApiPropertyOptional({ example: 'device-uuid-or-installation-id' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class SendNotificationDto {
  @ApiProperty({ example: 'Repertorio del domingo cargado', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  message!: string;
}
