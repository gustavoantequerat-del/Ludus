import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from './app.module';
import { configurarApp } from './configurar-app';

/**
 * Entrada para hosts serverless (Vercel).
 *
 * Ahi no hay un proceso que escuche un puerto: el host invoca una funcion por
 * peticion. Nest se arranca una sola vez y se reutiliza mientras la instancia
 * siga viva, por eso la promesa se guarda en vez de crear la app cada vez.
 */
const servidor = express();
let arranque: Promise<void> | null = null;

async function prepararApp(): Promise<void> {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(servidor), {
    // El host ya escribe sus propios logs de cada invocacion.
    logger: ['error', 'warn'],
  });
  configurarApp(app);
  await app.init();
}

export default async function handler(req: Request, res: Response): Promise<void> {
  arranque = arranque ?? prepararApp();
  await arranque;
  servidor(req, res);
}
