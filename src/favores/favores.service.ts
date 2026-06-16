import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Favor } from '../generated/prisma/client';
import { CreateFavorDto } from './create-favor.dto';
import { UpdateFavorDto } from './update-favor.dto';

@Injectable()
export class FavoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Favor[]> {
    return await this.prisma.favor.findMany({
      orderBy: { creadoEn: 'desc' },
    });
  }

  async findOne(id: string): Promise<Favor> {
    const favor = await this.prisma.favor.findUnique({
      where: { id },
    });

    if (!favor) {
      throw new NotFoundException(`Favor con id ${id} no encontrado`);
    }

    return favor;
  }

  async create(dto: CreateFavorDto): Promise<Favor> {
    return await this.prisma.favor.create({
      data: {
        tipo: dto.tipo,
        titulo: dto.titulo,
        descripcion: dto.descripcion,
        categoria: dto.categoria,
        latitude: dto.latitude,
        longitude: dto.longitude,
        expiraEn: dto.expiraEn ? new Date(dto.expiraEn) : null,
        telefonoContacto: dto.telefonoContacto ?? null,
      },
    });
  }

  async update(id: string, dto: UpdateFavorDto): Promise<Favor> {
    await this.findOne(id);

    return await this.prisma.favor.update({
      where: { id },
      data: {
        ...dto,
        expiraEn: dto.expiraEn ? new Date(dto.expiraEn) : undefined,
      },
    });
  }
  
  async remove(id: string): Promise<Favor> {
    await this.findOne(id);

    return await this.prisma.favor.delete({
      where: { id },
    });
  }
}
