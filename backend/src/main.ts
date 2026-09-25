import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configurarApp } from './configurar-app';
import { ConfiguracionApp } from './configuracion/configuracion';

async function iniciar() {
  const app = await NestFactory.create(AppModule);
  configurarApp(app);

  const config = app.get(ConfigService<ConfiguracionApp, true>);
  const puerto = config.get('puerto', { infer: true });

  await app.listen(puerto);
  // eslint-disable-next-line no-console
  console.log(`Sistema de Juegos (backend) escuchando en el puerto ${puerto}`);
}

iniciar();
