import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ConfiguracionApp } from './configuracion/configuracion';

async function iniciar() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<ConfiguracionApp, true>);

  app.enableCors();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const puerto = config.get('puerto', { infer: true });
  await app.listen(puerto);
  // eslint-disable-next-line no-console
  console.log(`Sistema de Juegos (backend) escuchando en el puerto ${puerto}`);
}

iniciar();
