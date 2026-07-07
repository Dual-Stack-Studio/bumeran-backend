import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConexionesService } from './conexiones.service';
import { CreateConexionDto } from './create-conexion.dto';

interface RequestConUsuario extends Request {
  user: User;
}

@Controller('conexiones')
@UseGuards(JwtAuthGuard)
export class ConexionesController {
  constructor(private readonly conexionesService: ConexionesService) {}

  @Post()
  create(@Body() dto: CreateConexionDto, @Req() req: RequestConUsuario) {
    return this.conexionesService.create(dto, req.user.id);
  }

  @Patch(':id/aceptar')
  aceptar(@Param('id') id: string, @Req() req: RequestConUsuario) {
    return this.conexionesService.aceptar(id, req.user.id);
  }

  @Patch(':id/completar')
  completar(@Param('id') id: string, @Req() req: RequestConUsuario) {
    return this.conexionesService.completar(id, req.user.id);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string, @Req() req: RequestConUsuario) {
    return this.conexionesService.cancelar(id, req.user.id);
  }

  @Get('favor/:favorId')
  getConexionesFavor(
    @Param('favorId') favorId: string,
    @Req() req: RequestConUsuario,
  ) {
    return this.conexionesService.getConexionesFavor(favorId, req.user.id);
  }

  @Get('mis')
  getMisConexiones(@Req() req: RequestConUsuario) {
    return this.conexionesService.getMisConexiones(req.user.id);
  }
}
