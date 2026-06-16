import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { User } from '../generated/prisma/client';
import { FavoresService } from './favores.service';
import { CreateFavorDto } from './create-favor.dto';
import { UpdateFavorDto } from './update-favor.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface RequestConUsuario extends Request {
  user: User;
}

@Controller('favores')
export class FavoresController {
  constructor(private readonly favoresService: FavoresService) {}

  @Get()
  findAll() {
    return this.favoresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.favoresService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateFavorDto, @Req() req: RequestConUsuario) {
    return this.favoresService.create(dto, req.user.id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFavorDto) {
    return this.favoresService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.favoresService.remove(id);
  }
}
