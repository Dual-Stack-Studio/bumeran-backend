import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { FavoresService } from './favores.service';
import { CreateFavorDto } from './create-favor.dto';
import { UpdateFavorDto } from './update-favor.dto';

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

  @Post()
  create(@Body() dto: CreateFavorDto) {
    return this.favoresService.create(dto);
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
