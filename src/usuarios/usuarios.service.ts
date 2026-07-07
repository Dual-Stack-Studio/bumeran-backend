import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async getPerfilPublico(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        photo: true,
        telefonoVerificado: true,
        promedioCalificacion: true,
        totalReviews: true,
        suspendido: true,
        createdAt: true,
        reviewsRecibidas: {
          select: {
            id: true,
            estrellas: true,
            comentario: true,
            creadoEn: true,
            autor: { select: { id: true, name: true, photo: true } },
            favor: { select: { id: true, titulo: true } },
          },
          orderBy: { creadoEn: 'desc' },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
