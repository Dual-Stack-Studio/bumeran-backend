import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');

  // Railway (y la mayoría de los hosts) ponen la app detrás de un proxy reverso.
  // Sin esto, Express ve la IP interna del proxy para TODAS las requests, y el
  // rate limiting (ThrottlerGuard) trataría a todos los usuarios como uno solo.
  app.set('trust proxy', 1);

  // Helmet agrega headers HTTP de seguridad por defecto (X-Content-Type-Options,
  // X-Frame-Options, Strict-Transport-Security, etc.) — protección básica contra
  // varios ataques comunes del lado del navegador.
  app.use(helmet());

  // Solo los orígenes conocidos pueden llamar a la API desde un navegador.
  // Esto no afecta a la app móvil (React Native no manda header Origin),
  // pero sí bloquea que cualquier sitio web ajeno haga requests desde JS del browser.
  app.enableCors({
    origin: [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(
      (origin): origin is string => !!origin,
    ),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
