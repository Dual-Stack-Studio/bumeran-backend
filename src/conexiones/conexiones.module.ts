import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConexionesController } from './conexiones.controller';
import { ConexionesService } from './conexiones.service';

@Module({
  imports: [PrismaModule],
  controllers: [ConexionesController],
  providers: [ConexionesService],
})
export class ConexionesModule {}
