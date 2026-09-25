import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { ConfiguracionApp } from './configuracion/configuracion';
import { CARPETAS_ARCHIVOS } from './archivos/archivos.constantes';

/** Tope del cuerpo JSON: las imagenes de personajes viajan en base64. */
const LIMITE_CUERPO = '6mb';

/**
 * Todo lo que la aplicacion necesita antes de atender peticiones.
 *
 * Vive aparte de `main.ts` porque hay dos formas de arrancarla: un servidor
 * propio (local, cPanel, cualquier host con Node) y una funcion serverless
 * (Vercel). Las dos tienen que configurar exactamente lo mismo.
 */
export function configurarApp(app: INestApplication): void {
  const config = app.get(ConfigService<ConfiguracionApp, true>);

  app.enableCors();
  app.use(express.json({ limit: LIMITE_CUERPO }));

  // Imagenes del juego: se sirven crudas en /archivos, fuera del prefijo /api.
  const rutaArchivos = config.get('rutaArchivos', { infer: true });
  CARPETAS_ARCHIVOS.forEach((carpeta) => {
    try {
      mkdirSync(join(rutaArchivos, carpeta), { recursive: true });
    } catch {
      // En un entorno serverless el disco es de solo lectura: las carpetas
      // vienen en el paquete desplegado y no hay nada que crear.
    }
  });
  app.use('/archivos', express.static(rutaArchivos, { fallthrough: true }));

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
}
