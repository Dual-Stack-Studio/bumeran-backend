import { Body, Controller, Delete, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsuariosService } from './usuarios.service';

interface RequestConUsuario extends Request {
  user: User;
}

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('push-token')
  guardarPushToken(
    @Req() req: RequestConUsuario,
    @Body('token') token: string,
  ) {
    return this.usuariosService.guardarPushToken(req.user.id, token);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  eliminarCuenta(@Req() req: RequestConUsuario) {
    return this.usuariosService.eliminarCuenta(req.user.id);
  }

  @Get(':id')
  getPerfilPublico(@Param('id') id: string) {
    return this.usuariosService.getPerfilPublico(id);
  }
}
