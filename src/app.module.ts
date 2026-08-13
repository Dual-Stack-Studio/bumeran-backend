import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { FavoresModule } from './favores/favores.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ConexionesModule } from './conexiones/conexiones.module';
import { VerificacionModule } from './verificacion/verificacion.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // Límite general por defecto para toda la API: 100 requests por minuto por IP.
    // Endpoints sensibles (como /auth/login) definen su propio límite más estricto
    // con el decorador @Throttle.
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
    PrismaModule,
    FavoresModule,
    UsuariosModule,
    AuthModule,
    ReviewsModule,
    ConexionesModule,
    VerificacionModule,
    NotificacionesModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
