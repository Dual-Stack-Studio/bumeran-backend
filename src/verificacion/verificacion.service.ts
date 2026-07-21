import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CODIGO_EXPIRA_MS = 10 * 60 * 1000; // 10 minutos

@Injectable()
export class VerificacionService {
  constructor(private readonly prisma: PrismaService) {}

  async enviarCodigo(
    userId: string,
    telefono: string,
  ): Promise<{ mensaje: string; codigo?: string }> {
    // En producción: integrar Twilio u otro proveedor SMS y NO devolver el código
    const codigo = Math.floor(100_000 + Math.random() * 900_000).toString();
    const expiraEn = new Date(Date.now() + CODIGO_EXPIRA_MS);

    await this.prisma.verificacionTelefono.upsert({
      where: { userId },
      create: { userId, telefono, codigo, expiraEn },
      update: { telefono, codigo, expiraEn },
    });

    // Actualizamos el teléfono en el perfil aunque todavía no esté verificado
    await this.prisma.user.update({
      where: { id: userId },
      data: { telefono, telefonoVerificado: false },
    });

    const esProduccion = process.env.NODE_ENV === 'production';
    return {
      mensaje: esProduccion
        ? 'Código enviado por SMS'
        : 'Código generado (modo desarrollo — intégra Twilio en producción)',
      ...(esProduccion ? {} : { codigo }),
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
