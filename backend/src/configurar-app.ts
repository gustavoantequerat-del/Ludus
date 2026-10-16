import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import express from 'express';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { ConfiguracionApp } from './configuracion/configuracion';
import { CARPETAS_ARCHIVOS } from './archivos/archivos.constantes';
import { ErroresBdFiltro } from './comun/filtros/errores-bd.filtro';
import { TIPO_XLSX } from './usuarios/importacion/excel-usuarios';
import { crearErrorValidacion } from './comun/validacion/errores-validacion';

/** Tope del cuerpo JSON: las imagenes de personajes viajan en base64. */
const LIMITE_CUERPO = '6mb';

/**
 * Tope de un video del Runner Narrativo. Un poco mas que el limite real
 * (LIMITES_VIDEO) para que un video apenas pasado reciba el mensaje claro del
 * servicio y no el error generico de "cuerpo demasiado grande".
 */
const LIMITE_VIDEO = '11mb';

/** Tope del Excel de importacion masiva de usuarios. */
const LIMITE_EXCEL = '2mb';

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
  app.use(express.raw({ type: 'video/mp4', limit: LIMITE_VIDEO }));
  app.use(express.raw({ type: TIPO_XLSX, limit: LIMITE_EXCEL }));

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
      exceptionFactory: crearErrorValidacion,
    }),
  );
  app.useGlobalFilters(new ErroresBdFiltro());
}
