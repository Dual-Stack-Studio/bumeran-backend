import { Module } from '@nestjs/common';
import { FavoresService } from './favores.service';
import { FavoresController } from './favores.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FavoresController],
  providers: [FavoresService],
})
export class FavoresModule {}
