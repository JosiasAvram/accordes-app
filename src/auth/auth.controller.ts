import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
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
}
