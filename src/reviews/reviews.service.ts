import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { CreateReviewDto } from './create-review.dto';

// Umbral de suspensión: promedio < 2.0 con al menos 3 reseñas
const SUSPENSION_MIN_REVIEWS = 3;
const SUSPENSION_MAX_PROMEDIO = 2.0;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async create(dto: CreateReviewDto, autorId: string) {
    if (autorId === dto.destinatarioId) {
      throw new BadRequestException('No podés calificarte a vos mismo');
    }

    // Verificar que existe una conexión completada entre estos dos usuarios para este favor
    const conexion = await this.prisma.favorConexion.findFirst({
      where: {
        favorId: dto.favorId,
        estado: 'completada',
        OR: [
          { solicitanteId: autorId, ayudanteId: dto.destinatarioId },
          { ayudanteId: autorId, solicitanteId: dto.destinatarioId },
        ],
      },
    });

    if (!conexion) {
      throw new ForbiddenException(
        'Solo podés calificar a alguien con quien completaste un favor',
      );
    }

    // Verificar que el destinatario existe
    const destinatario = await this.prisma.user.findUnique({
      where: { id: dto.destinatarioId },
    });
    if (!destinatario) {
      throw new NotFoundException('Usuario destinatario no encontrado');
    }

    // @@unique([favorId, autorId]) — ya existe la review?
    const existente = await this.prisma.review.findUnique({
      where: { favorId_autorId: { favorId: dto.favorId, autorId } },
    });
    if (existente) {
      throw new ConflictException('Ya calificaste a esta persona por este favor');
    }

    const review = await this.prisma.review.create({
      data: {
        favorId: dto.favorId,
        autorId,
        destinatarioId: dto.destinatarioId,
        estrellas: dto.estrellas,
        comentario: dto.comentario ?? null,
      },
      include: {
        autor: { select: { id: true, name: true, photo: true } },
      },
    });

    // Recalcular stats del destinatario y evaluar suspensión
    await this.recalcularEstadisticas(dto.destinatarioId);

    return review;
  }

  async getReviewsDeUsuario(userId: string) {
    return this.prisma.review.findMany({
      where: { destinatarioId: userId },
      include: {
        autor: { select: { id: true, name: true, photo: true } },
        favor: { select: { id: true, titulo: true } },
      },
      orderBy: { creadoEn: 'desc' },
    });
  }

  private async recalcularEstadisticas(userId: string): Promise<void> {
    const [reviews, usuarioActual] = await Promise.all([
      this.prisma.review.findMany({
        where: { destinatarioId: userId },
        select: { estrellas: true },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { suspendido: true },
      }),
    ]);

    const total = reviews.length;
    const promedio =
      total > 0
        ? reviews.reduce((sum, r) => sum + r.estrellas, 0) / total
        : null;

    const debeSuspenderse =
      total >= SUSPENSION_MIN_REVIEWS &&
      promedio !== null &&
      promedio < SUSPENSION_MAX_PROMEDIO;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totalReviews: total,
        promedioCalificacion: promedio,
        suspendido: debeSuspenderse,
      },
    });

    // Si se suspendió, cancelar todos sus favores activos
    if (debeSuspenderse) {
      await this.prisma.favor.updateMany({
        where: {
          userId,
          estado: { in: ['abierto', 'en_proceso'] },
        },
        data: { estado: 'cancelado' },
      });
    }

    // Avisamos al usuario solo cuando el estado de suspensión cambia de verdad,
    // no en cada review nueva.
    const yaEstabaSuspendido = usuarioActual?.suspendido ?? false;
    if (debeSuspenderse && !yaEstabaSuspendido) {
      void this.notificaciones.crear(
        userId,
        'cuenta_suspendida',
        'Tu cuenta fue suspendida',
        'Tu promedio de calificaciones bajó de 2.0 estrellas. No podés publicar ni conectarte con vecinos hasta que se reactive.',
      );
    } else if (!debeSuspenderse && yaEstabaSuspendido) {
      void this.notificaciones.crear(
        userId,
        'cuenta_reactivada',
        'Tu cuenta fue reactivada',
        'Tu promedio de calificaciones mejoró y tu cuenta ya no está suspendida. Ya podés volver a publicar y conectarte con vecinos.',
      );
    }
  }
}
