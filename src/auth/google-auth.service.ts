import { Injectable, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';

export interface GooglePayload {
  googleId: string;
  email: string;
  name: string | null;
  photo: string | null;
}

@Injectable()
export class GoogleAuthService {
  private readonly client: OAuth2Client;

  constructor() {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      throw new Error('GOOGLE_CLIENT_ID no está definida en el archivo .env');
    }

    this.client = new OAuth2Client(clientId);
  }

  async verify(idToken: string): Promise<GooglePayload> {
    let ticket;

    try {
      ticket = await this.client.verifyIdToken({
        idToken,
        // Acepta tokens de cualquier cliente OAuth configurado en el proyecto
        // (web, Android, iOS). Si GOOGLE_ANDROID_CLIENT_ID está definido, lo incluye.
        audience: [
          process.env.GOOGLE_CLIENT_ID!,
          ...(process.env.GOOGLE_ANDROID_CLIENT_ID
            ? [process.env.GOOGLE_ANDROID_CLIENT_ID]
            : []),
        ],
      });
    } catch {
      throw new UnauthorizedException('Token de Google inválido');
    }

    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
      throw new UnauthorizedException('Token de Google sin datos válidos');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? null,
      photo: payload.picture ?? null,
    };
  }
}
