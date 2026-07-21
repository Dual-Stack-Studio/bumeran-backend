import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Twilio } from 'twilio';
import { PrismaService } from '../prisma/prisma.service';

const CODIGO_EXPIRA_MS = 10 * 60 * 1000; // 10 minutos

@Injectable()
export class VerificacionService {
  private twilio: Twilio | null = null;

  constructor(private readonly prisma: PrismaService) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (sid && token) {
      this.twilio = new Twilio(sid, token);
    }
  }

  async enviarCodigo(
    userId: string,
    telefono: string,
  ): Promise<{ mensaje: string; codigo?: string }> {
    const codigo = Math.floor(100_000 + Math.random() * 900_000).toString();
    const expiraEn = new Date(Date.now() + CODIGO_EXPIRA_MS);

    await this.prisma.verificacionTelefono.upsert({
      where: { userId },
      create: { userId, telefono, codigo, expiraEn },
      update: { telefono, codigo, expiraEn },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { telefono, telefonoVerificado: false },
    });

    if (this.twilio) {
      try {
        await this.twilio.messages.create({
          body: `Tu código de verificación para Bumerán es: ${codigo}. Expira en 10 minutos.`,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: telefono,
        });
      } catch (err: any) {
        throw new InternalServerErrorException(
          `No se pudo enviar el SMS: ${err.message}`,
        );
      }
      return { mensaje: 'Código enviado por SMS' };
    }

    // Sin Twilio configurado: modo desarrollo, devolver el código
    return {
      mensaje: 'Código generado (modo desarrollo — Twilio no configurado)',
      codigo,
    };
  }

  async confirmarCodigo(
    userId: string,
    codigo: string,
  ): Promise<{ verificado: boolean }> {
    const verificacion = await this.prisma.verificacionTelefono.findUnique({
      where: { userId },
    });

    if (!verificacion) {
      throw new NotFoundException('No hay verificación pendiente. Solicitá un código primero.');
    }
    if (new Date() > verificacion.expiraEn) {
      throw new BadRequestException('El código expiró. Solicitá uno nuevo.');
    }
    if (verificacion.codigo !== codigo) {
      throw new BadRequestException('Código incorrecto.');
    }

    // ANTI-ABUSO: bloquear si el número ya está verificado por OTRA cuenta
    const cuentaExistente = await this.prisma.user.findFirst({
      where: {
        telefono: verificacion.telefono,
        telefonoVerificado: true,
        id: { not: userId },
      },
    });
    if (cuentaExistente) {
      throw new ConflictException(
        'Este número de teléfono ya está verificado en otra cuenta. ' +
          'No podés usar el mismo número en múltiples cuentas.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          telefonoVerificado: true,
          telefonoVerificadoEn: new Date(),
        },
      }),
      this.prisma.verificacionTelefono.delete({ where: { userId } }),
    ]);

    return { verificado: true };
  }

  async getEstado(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        telefono: true,
        telefonoVerificado: true,
        telefonoVerificadoEn: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
