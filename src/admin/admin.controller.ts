import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';
import { SuspenderDto } from './suspender.dto';

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('usuarios')
  listarUsuarios(
    @Query('search') search?: string,
    @Query('suspendido') suspendido?: string,
    @Query('page') page?: string,
  ) {
    return this.adminService.listarUsuarios({
      search,
      suspendido:
        suspendido === undefined ? undefined : suspendido === 'true',
      page: page ? Number(page) : undefined,
    });
  }

  @Get('usuarios/:id')
  getUsuario(@Param('id') id: string) {
    return this.adminService.getUsuario(id);
  }

  @Patch('usuarios/:id/suspension')
  setSuspendido(@Param('id') id: string, @Body() dto: SuspenderDto) {
    return this.adminService.setSuspendido(id, dto.suspendido);
  }
}
