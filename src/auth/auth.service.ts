import { Injectable } from '@nestjs/common';
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

  async login(dto: LoginDto): Promise<LoginResponse> {
    const googlePayload = await this.googleAuthService.verify(dto.idToken);

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
