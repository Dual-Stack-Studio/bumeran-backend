import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VerificacionController } from './verificacion.controller';
import { VerificacionService } from './verificacion.service';

@Module({
  imports: [PrismaModule],
  controllers: [VerificacionController],
  providers: [VerificacionService],
})
export class VerificacionModule {}
