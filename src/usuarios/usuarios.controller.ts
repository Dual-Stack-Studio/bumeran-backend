import { Controller, Get, Param } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get(':id')
  getPerfilPublico(@Param('id') id: string) {
    return this.usuariosService.getPerfilPublico(id);
  }
}
