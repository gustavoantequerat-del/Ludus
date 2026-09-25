import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { ConfiguracionApp } from './configuracion/configuracion';
import { CARPETAS_ARCHIVOS } from './archivos/archivos.constantes';

/** Tope del cuerpo JSON: las imagenes de personajes viajan en base64. */
const LIMITE_CUERPO = '6mb';

async function iniciar() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService<ConfiguracionApp, true>);

  app.enableCors();
  app.use(express.json({ limit: LIMITE_CUERPO }));

  // Imagenes del juego: se sirven crudas en /archivos, fuera del prefijo /api.
  const rutaArchivos = config.get('rutaArchivos', { infer: true });
  CARPETAS_ARCHIVOS.forEach((carpeta) =>
    mkdirSync(join(rutaArchivos, carpeta), { recursive: true }),
  );
  app.use('/archivos', express.static(rutaArchivos, { fallthrough: true }));

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
