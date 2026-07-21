import { Controller, Get, Patch, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificacionesService } from './notificaciones.service';

interface ReqConUsuario extends Request {
  user: User;
}

@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}

  @Get()
  getMias(@Req() req: ReqConUsuario) {
    return this.service.getMias(req.user.id);
  }

  @Patch('leer-todas')
  marcarTodasLeidas(@Req() req: ReqConUsuario) {
    return this.service.marcarTodasLeidas(req.user.id);
  }

  @Patch(':id/leer')
  marcarLeida(@Param('id') id: string, @Req() req: ReqConUsuario) {
    return this.service.marcarLeida(id, req.user.id);
  }
}
