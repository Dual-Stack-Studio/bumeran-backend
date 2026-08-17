import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../generated/prisma/client';
import { GoogleAuthService } from './google-auth.service';
import { LoginDto } from './login.dto';

export interface LoginResponse {
  token: string;
  usuario: User;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Mientras la app esté en prueba cerrada: si ALLOWED_EMAILS está definida,
   * solo esos emails pueden loguearse. Sin esa variable (o vacía), no hay
   * restricción — así se puede sacar el candado sin tocar código cuando
   * la app pase a estar abierta al público.
   */
  private verificarEmailPermitido(email: string): void {
    const listaPermitidos = process.env.ALLOWED_EMAILS;
    if (!listaPermitidos || !listaPermitidos.trim()) return;

    const permitidos = listaPermitidos
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (!permitidos.includes(email.toLowerCase())) {
      throw new ForbiddenException(
        'Bumerán todavía está en prueba cerrada. Tu cuenta no está habilitada — pedile acceso al desarrollador.',
      );
    }
  }

  async login(dto: LoginDto): Promise<LoginResponse> {
    const googlePayload = await this.googleAuthService.verify(dto.idToken);

    this.verificarEmailPermitido(googlePayload.email);

    const usuario = await this.prisma.user.upsert({
      where: { googleId: googlePayload.googleId },
      update: {
        name: googlePayload.name,
        email: googlePayload.email,
        photo: googlePayload.photo,
      },
      create: {
        googleId: googlePayload.googleId,
        name: googlePayload.name,
        email: googlePayload.email,
        photo: googlePayload.photo,
      },
    });

    const token = this.jwtService.sign({ sub: usuario.id });

    return { token, usuario };
  }

  async findUserById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({ where: { id } });
  }
}
