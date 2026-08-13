import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { User } from '../generated/prisma/client';

interface RequestConUsuario extends Request {
  user: User;
}

const JwtCheck = AuthGuard('jwt');

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly jwtCheck = new JwtCheck();

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const autenticado = await this.jwtCheck.canActivate(context);
    if (!autenticado) return false;

    const req = context.switchToHttp().getRequest<RequestConUsuario>();
    if (!req.user?.isAdmin) {
      throw new ForbiddenException('Requiere permisos de administrador');
    }

    return true;
  }
}
