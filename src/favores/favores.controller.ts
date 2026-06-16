import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Req,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
  async findAll(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data, total } = await this.favoresService.findAll(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );

    res.setHeader('X-Total-Count', total.toString());
    return data;
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

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFavorDto,
    @Req() req: RequestConUsuario,
  ) {
    return this.favoresService.update(id, dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestConUsuario) {
    return this.favoresService.remove(id, req.user.id);
  }
}
