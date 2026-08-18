import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import type { Prisma } from '../generated/prisma/client';

const PAGE_SIZE = 20;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async listarUsuarios(opts: {
    search?: string;
    suspendido?: boolean;
    page?: number;
  }) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;

    const where: Prisma.UserWhereInput = {
      ...(opts.suspendido !== undefined ? { suspendido: opts.suspendido } : {}),
      ...(opts.search
        ? {
            OR: [
              { name: { contains: opts.search, mode: 'insensitive' } },
              { email: { contains: opts.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [usuarios, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          photo: true,
          telefonoVerificado: true,
          promedioCalificacion: true,
          totalReviews: true,
          suspendido: true,
          isAdmin: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      usuarios,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  }

  async getUsuario(id: string) {
    const usuario = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        photo: true,
        telefono: true,
        telefonoVerificado: true,
        promedioCalificacion: true,
        totalReviews: true,
        suspendido: true,
        isAdmin: true,
        createdAt: true,
        favores: {
          select: {
            id: true,
            titulo: true,
            tipo: true,
            estado: true,
            creadoEn: true,
          },
          orderBy: { creadoEn: 'desc' },
        },
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

    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async setSuspendido(id: string, suspendido: boolean) {
    const usuario = await this.prisma.user.findUnique({ where: { id } });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');

    await this.prisma.user.update({
      where: { id },
      data: { suspendido },
    });

    // Al suspender manualmente, cancelamos sus favores activos igual que
    // hace la suspensión automática por calificaciones bajas.
    if (suspendido) {
      await this.prisma.favor.updateMany({
        where: { userId: id, estado: { in: ['abierto', 'en_proceso'] } },
        data: { estado: 'cancelado' },
      });
    }

    if (usuario.suspendido !== suspendido) {
      void this.notificaciones.crear(
        id,
        suspendido ? 'cuenta_suspendida' : 'cuenta_reactivada',
        suspendido ? 'Tu cuenta fue suspendida' : 'Tu cuenta fue reactivada',
        suspendido
          ? 'Un administrador suspendió tu cuenta. No podés publicar ni conectarte con vecinos hasta que se reactive.'
          : 'Tu cuenta fue reactivada por un administrador. Ya podés volver a publicar y conectarte con vecinos.',
        { motivo: 'admin' },
      );
    }

    return this.getUsuario(id);
  }
}
