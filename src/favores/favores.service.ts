import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Favor } from '../generated/prisma/client';
import { CreateFavorDto } from './create-favor.dto';
import { UpdateFavorDto } from './update-favor.dto';

const PAGE_SIZE_DEFAULT = 50;
const PAGE_SIZE_MAX = 50;

export interface FavoresPaginados {
  data: Favor[];
  total: number;
}

@Injectable()
export class FavoresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = PAGE_SIZE_DEFAULT): Promise<FavoresPaginados> {
    const limitSeguro = Math.min(Math.max(limit, 1), PAGE_SIZE_MAX);
    const paginaSegura = Math.max(page, 1);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.favor.findMany({
        orderBy: { creadoEn: 'desc' },
        skip: (paginaSegura - 1) * limitSeguro,
        take: limitSeguro,
      }),
      this.prisma.favor.count(),
    ]);

    return { data, total };
  }

  async findMine(userId: string): Promise<Favor[]> {
    return this.prisma.favor.findMany({
      where: { userId },
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

  async create(dto: CreateFavorDto, userId: string): Promise<Favor> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { suspendido: true },
    });
    if (user?.suspendido) {
      throw new ForbiddenException(
        'Tu cuenta está suspendida por calificaciones negativas. No podés crear nuevas publicaciones.',
      );
    }

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
        fotos: dto.fotos ?? [],
        userId,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateFavorDto,
    userId: string,
  ): Promise<Favor> {
    const favor = await this.findOne(id);
    this.verificarPropietario(favor, userId);

    return await this.prisma.favor.update({
      where: { id },
      data: {
        ...dto,
        expiraEn: dto.expiraEn ? new Date(dto.expiraEn) : undefined,
      },
    });
  }

  async remove(id: string, userId: string): Promise<Favor> {
    const favor = await this.findOne(id);
    this.verificarPropietario(favor, userId);

    return await this.prisma.favor.delete({
      where: { id },
    });
  }

  private verificarPropietario(favor: Favor, userId: string): void {
    if (favor.userId !== userId) {
      throw new ForbiddenException('No podés modificar un favor que no es tuyo');
    }
  }
}
