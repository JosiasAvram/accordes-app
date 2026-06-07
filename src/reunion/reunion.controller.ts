import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReunionService, ReunionAssignments } from './reunion.service';

@ApiTags('reunion')
@Controller('reunion')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReunionController {
  constructor(private readonly service: ReunionService) {}

  @Get('current')
  @ApiOperation({ summary: 'Devuelve la reunion actual con cada slot populated.' })
  getCurrent() {
    return this.service.getCurrent();
  }

  @Put('current')
  @ApiOperation({
    summary: 'Actualiza asignaciones de la reunion. Solo admin o lider.',
  })
  async updateCurrent(
    @Req() req: { user: { role: string } },
    @Body() body: ReunionAssignments,
  ) {
    const role = req.user?.role;
    if (role !== 'admin' && role !== 'lider') {
      throw new ForbiddenException(
        'Solo el admin o el líder pueden modificar la reunión.',
      );
    }
    return this.service.updateAssignments(body);
  }
}
