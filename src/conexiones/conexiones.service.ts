import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConexionDto } from './create-conexion.dto';

@Injectable()
export class ConexionesService {
  constructor(private readonly prisma: PrismaService) {}

  // El ayudante (quien ofrece ayuda) crea la conexión
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

    return this.prisma.favorConexion.create({
      data: {
        favorId: dto.favorId,
        solicitanteId: favor.userId!,
        ayudanteId,
        estado: 'pendiente',
      },
      include: {
        ayudante: { select: { id: true, name: true, photo: true, telefonoVerificado: true } },
        favor: { select: { id: true, titulo: true } },
      },
    });
  }

  // El dueño del favor acepta al ayudante
  async aceptar(id: string, userId: string) {
    const conexion = await this.prisma.favorConexion.findUnique({
      where: { id },
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

    return conexionActualizada;
  }

  // Cualquiera de los dos participantes puede marcar como completado
  async completar(id: string, userId: string) {
    const conexion = await this.prisma.favorConexion.findUnique({
      where: { id },
    });
    if (!conexion) throw new NotFoundException('Conexión no encontrada');
    if (
      conexion.solicitanteId !== userId &&
      conexion.ayudanteId !== userId
    ) {
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

    return conexionActualizada;
  }

  // Cancelar una conexión pendiente o aceptada
  async cancelar(id: string, userId: string) {
    const conexion = await this.prisma.favorConexion.findUnique({
      where: { id },
    });
    if (!conexion) throw new NotFoundException('Conexión no encontrada');
    if (
      conexion.solicitanteId !== userId &&
      conexion.ayudanteId !== userId
    ) {
      throw new ForbiddenException('Solo los participantes pueden cancelar esta conexión');
    }
    if (conexion.estado === 'completada') {
      throw new BadRequestException('No se puede cancelar una conexión completada');
    }

    const conexionActualizada = await this.prisma.favorConexion.update({
      where: { id },
      data: { estado: 'cancelada' },
    });

    // Si estaba aceptada, el favor vuelve a abierto
    if (conexion.estado === 'aceptada') {
      await this.prisma.favor.update({
        where: { id: conexion.favorId },
        data: { estado: 'abierto' },
      });
    }

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
