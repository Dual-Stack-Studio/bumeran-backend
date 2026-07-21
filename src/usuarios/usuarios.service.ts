import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async eliminarCuenta(userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Verificación de teléfono pendiente
      await tx.verificacionTelefono.deleteMany({ where: { userId } });

      // 2. IDs de favores propios (para eliminar sus reviews y conexiones primero)
      const favoresIds = (
        await tx.favor.findMany({ where: { userId }, select: { id: true } })
      ).map((f) => f.id);

      if (favoresIds.length > 0) {
        await tx.review.deleteMany({ where: { favorId: { in: favoresIds } } });
        await tx.favorConexion.deleteMany({ where: { favorId: { in: favoresIds } } });
      }

      // 3. Reviews escritas o recibidas en favores ajenos
      await tx.review.deleteMany({
        where: { OR: [{ autorId: userId }, { destinatarioId: userId }] },
      });

      // 4. Conexiones en favores ajenos
      await tx.favorConexion.deleteMany({
        where: { OR: [{ solicitanteId: userId }, { ayudanteId: userId }] },
      });

      // 5. Favores propios
      await tx.favor.deleteMany({ where: { userId } });

      // 6. Usuario
      await tx.user.delete({ where: { id: userId } });
    });
  }

  async guardarPushToken(userId: string, token: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: token },
    });
  }

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
