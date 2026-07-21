import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(
    userId: string,
    tipo: string,
    titulo: string,
    cuerpo: string,
    payload?: object,
  ) {
    const [notif, user] = await Promise.all([
      this.prisma.notificacion.create({
        data: { userId, tipo, titulo, cuerpo, payload },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { expoPushToken: true },
      }),
    ]);

    if (user?.expoPushToken) {
      void this.enviarPush(user.expoPushToken, titulo, cuerpo, payload);
    }

    return notif;
  }

  async getMias(userId: string) {
    return this.prisma.notificacion.findMany({
      where: { userId },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    });
  }

  async marcarLeida(id: string, userId: string) {
    return this.prisma.notificacion.updateMany({
      where: { id, userId },
      data: { leida: true },
    });
  }

  async marcarTodasLeidas(userId: string) {
    return this.prisma.notificacion.updateMany({
      where: { userId, leida: false },
      data: { leida: true },
    });
  }

  private async enviarPush(
    token: string,
    titulo: string,
    cuerpo: string,
    data?: object,
  ) {
    try {
      await fetch('https://exp.host/--/expo-push/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          to: token,
          title: titulo,
          body: cuerpo,
          data: data ?? {},
          sound: 'default',
        }),
      });
    } catch (err) {
      console.error('[Push] Error enviando notificacion:', err);
    }
  }
}
