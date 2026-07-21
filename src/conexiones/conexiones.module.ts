import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { ConexionesController } from './conexiones.controller';
import { ConexionesService } from './conexiones.service';

@Module({
  imports: [PrismaModule, NotificacionesModule],
  controllers: [ConexionesController],
  providers: [ConexionesService],
})
export class ConexionesModule {}
