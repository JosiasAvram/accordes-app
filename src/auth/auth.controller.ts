import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login con username y password. Devuelve JWT.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registro de un nuevo usuario con rol "miembro".' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Devuelve los datos del usuario LOGUEADO con el rol VIVO desde la DB.',
  })
  async me(@Req() req: { user: { sub: string } }) {
    // Buscamos el rol vivo en la DB (no el del JWT) para que cuando el admin
    // cambie el rol de un user, su frontend se actualice al hacer polling.
    const user = await this.usersService.findById(req.user.sub);
    return {
      id: (user._id as { toString(): string }).toString(),
      username: user.username,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      instrument: user.instrument,
      role: user.role,
    };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Inicia recuperación de contraseña (envía código por mail).' })
  forgotPassword(@Body() body: { identifier: string }) {
    return this.authService.forgotPassword(body?.identifier ?? '');
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Valida código recibido por mail y setea nueva contraseña.' })
  resetPassword(
    @Body() body: { identifier: string; code: string; newPassword: string },
  ) {
    return this.authService.resetPasswordWithCode(
      body?.identifier ?? '',
      body?.code ?? '',
      body?.newPassword ?? '',
    );
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambia la contraseña del usuario logueado (valida la actual).' })
  async changePassword(
    @Body() body: { currentPassword: string; newPassword: string },
    @Req() req: { user: { sub: string } },
  ) {
    if (!body?.currentPassword || !body?.newPassword) {
      throw new BadRequestException('Faltan datos.');
    }
    try {
      await this.usersService.changePassword(
        req.user.sub,
        body.currentPassword,
        body.newPassword,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo cambiar la contraseña.';
      throw new BadRequestException(msg);
    }
    return { ok: true };
  }
}
