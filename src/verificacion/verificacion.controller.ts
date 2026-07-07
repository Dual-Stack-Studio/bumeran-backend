import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import type { Request } from 'express';
import type { User } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VerificacionService } from './verificacion.service';

class EnviarCodigoDto {
  @IsString()
  telefono: string;
}

class ConfirmarCodigoDto {
  @IsString()
  codigo: string;
}

interface RequestConUsuario extends Request {
  user: User;
}

@Controller('verificacion')
@UseGuards(JwtAuthGuard)
export class VerificacionController {
  constructor(private readonly verificacionService: VerificacionService) {}

  @Post('enviar')
  enviar(@Body() dto: EnviarCodigoDto, @Req() req: RequestConUsuario) {
    return this.verificacionService.enviarCodigo(req.user.id, dto.telefono);
  }

  @Post('confirmar')
  confirmar(@Body() dto: ConfirmarCodigoDto, @Req() req: RequestConUsuario) {
    return this.verificacionService.confirmarCodigo(req.user.id, dto.codigo);
  }

  @Get('estado')
  estado(@Req() req: RequestConUsuario) {
    return this.verificacionService.getEstado(req.user.id);
  }
}
