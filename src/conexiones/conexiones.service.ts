import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateConexionDto } from './create-conexion.dto';

@Injectable()
export class ConexionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async create(dto: CreateConexionDto, ayudanteId: string) {
    const favor = await this.prisma.favor.findUnique({
      where: { id: dto.favorId },
    });
    if (!favor) throw new NotFoundException('Favor no encontrado');
    if (favor.userId === ayudanteId) {
      throw new BadRequestException('No podés conectarte con tu propio favor');
    }
    if (favor.estado !== 'abierto') {
      throw new BadRequestException('Este favor ya no acepta nuevas conexiones');
    }
    if (!favor.userId) {
      throw new BadRequestException('Este favor no tiene un dueño válido, no se puede conectar.');
    }

    const ayudante = await this.prisma.user.findUnique({
      where: { id: ayudanteId },
      select: { suspendido: true, telefonoVerificado: true },
    });
    if (ayudante?.suspendido) {
      throw new ForbiddenException(
        'Tu cuenta está suspendida por calificaciones negativas. No podés conectarte a favores.',
      );
    }
    if (!ayudante?.telefonoVerificado) {
      throw new ForbiddenException(
        'Necesitás verificar tu número de teléfono antes de conectarte con vecinos.',
      );
    }

    const existente = await this.prisma.favorConexion.findUnique({
      where: { favorId_ayudanteId: { favorId: dto.favorId, ayudanteId } },
    });
    if (existente) {
      throw new ConflictException('Ya enviaste una solicitud para este favor');
    }

    const resultado = await this.prisma.favorConexion.create({
      data: {
        favorId: dto.favorId,
        solicitanteId: favor.userId,
        ayudanteId,
        estado: 'pendiente',
      },
      include: {
        ayudante: { select: { id: true, name: true, photo: true, telefonoVerificado: true } },
        favor: { select: { id: true, titulo: true } },
      },
    });

    if (favor.userId) {
      void this.notificaciones.crear(
        favor.userId,
        'conexion_nueva',
        'Nueva solicitud de ayuda',
        `${resultado.ayudante.name ?? 'Alguien'} quiere ayudarte con «${resultado.favor.titulo}»`,
        {
          favorId: favor.id,
          conexionId: resultado.id,
          favorTitulo: resultado.favor.titulo,
          ayudanteNombre: resultado.ayudante.name ?? null,
        },
      );
    }

    return resultado;
  }

  async aceptar(id: string, userId: string) {
    try {
      const conexion = await this.prisma.favorConexion.findUnique({
        where: { id },
        include: { favor: { select: { titulo: true } } },
      });
      if (!conexion) throw new NotFoundException('Conexión no encontrada');
      if (conexion.solicitanteId !== userId) {
        throw new ForbiddenException('Solo el dueño del favor puede aceptar');
      }
      if (conexion.estado !== 'pendiente') {
        throw new BadRequestException('Esta conexión ya fue procesada');
      }

      const [conexionActualizada] = await this.prisma.$transaction([
        this.prisma.favorConexion.update({
          where: { id },
          data: { estado: 'aceptada' },
        }),
        this.prisma.favor.update({
          where: { id: conexion.favorId },
          data: { estado: 'en_proceso' },
        }),
      ]);

      void this.notificaciones.crear(
        conexion.ayudanteId,
        'conexion_aceptada',
        'Solicitud aceptada 🎉',
        `Tu solicitud para «${conexion.favor.titulo}» fue aceptada.`,
        { favorId: conexion.favorId, conexionId: id, favorTitulo: conexion.favor.titulo },
      );

      return conexionActualizada;
    } catch (err: any) {
      // TEMPORAL: log detallado para diagnosticar el "Unexpected token" que reporta el cliente.
      console.error('[conexiones.aceptar] id=%s userId=%s error=%s stack=%s', id, userId, err?.message, err?.stack);
      throw err;
    }
  }

  async completar(id: string, userId: string) {
    const conexion = await this.prisma.favorConexion.findUnique({
      where: { id },
      include: { favor: { select: { titulo: true } } },
    });
    if (!conexion) throw new NotFoundException('Conexión no encontrada');
    if (conexion.solicitanteId !== userId && conexion.ayudanteId !== userId) {
      throw new ForbiddenException(
        'Solo los participantes pueden completar esta conexión',
      );
    }
    if (conexion.estado !== 'aceptada') {
      throw new BadRequestException('La conexión debe estar aceptada antes de completarse');
    }

    const [conexionActualizada] = await this.prisma.$transaction([
      this.prisma.favorConexion.update({
        where: { id },
        data: { estado: 'completada' },
      }),
      this.prisma.favor.update({
        where: { id: conexion.favorId },
        data: { estado: 'cerrado' },
      }),
    ]);

    const otroUsuarioId =
      userId === conexion.solicitanteId ? conexion.ayudanteId : conexion.solicitanteId;

    void this.notificaciones.crear(
      otroUsuarioId,
      'conexion_completada',
      '¡Favor completado! ✅',
      `«${conexion.favor.titulo}» fue completado. ¡Calificá tu experiencia!`,
      { favorId: conexion.favorId, conexionId: id, favorTitulo: conexion.favor.titulo },
    );

    return conexionActualizada;
  }

  async cancelar(id: string, userId: string) {
    const conexion = await this.prisma.favorConexion.findUnique({
      where: { id },
      include: { favor: { select: { titulo: true } } },
    });
    if (!conexion) throw new NotFoundException('Conexión no encontrada');
    if (conexion.solicitanteId !== userId && conexion.ayudanteId !== userId) {
      throw new ForbiddenException('Solo los participantes pueden cancelar esta conexión');
    }
    if (conexion.estado === 'completada') {
      throw new BadRequestException('No se puede cancelar una conexión completada');
    }

    const conexionActualizada = await this.prisma.favorConexion.update({
      where: { id },
      data: { estado: 'cancelada' },
    });

    if (conexion.estado === 'aceptada') {
      await this.prisma.favor.update({
        where: { id: conexion.favorId },
        data: { estado: 'abierto' },
      });
    }

    const otroUsuarioId =
      userId === conexion.solicitanteId ? conexion.ayudanteId : conexion.solicitanteId;

    void this.notificaciones.crear(
      otroUsuarioId,
      'conexion_cancelada',
      'Conexión cancelada',
      `La conexión para «${conexion.favor.titulo}» fue cancelada.`,
      { favorId: conexion.favorId, conexionId: id, favorTitulo: conexion.favor.titulo },
    );

    return conexionActualizada;
  }

  async getConexionesFavor(favorId: string, userId: string) {
    const favor = await this.prisma.favor.findUnique({ where: { id: favorId } });
    if (!favor) throw new NotFoundException('Favor no encontrado');
    if (favor.userId !== userId) {
      throw new ForbiddenException('Solo el dueño puede ver las conexiones de su favor');
    }

    return this.prisma.favorConexion.findMany({
      where: { favorId },
      include: {
        ayudante: {
          select: {
            id: true,
            name: true,
            photo: true,
            telefonoVerificado: true,
            promedioCalificacion: true,
            totalReviews: true,
          },
        },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  async getMisConexiones(userId: string) {
    return this.prisma.favorConexion.findMany({
      where: {
        OR: [{ solicitanteId: userId }, { ayudanteId: userId }],
      },
      include: {
        favor: { select: { id: true, titulo: true, tipo: true, estado: true } },
        solicitante: { select: { id: true, name: true, photo: true } },
        ayudante: { select: { id: true, name: true, photo: true } },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }
}
