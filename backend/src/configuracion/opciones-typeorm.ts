import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfiguracionApp } from './configuracion';

export const construirOpcionesTypeOrm = (
  config: ConfigService<ConfiguracionApp, true>,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: config.get('baseDeDatos.host', { infer: true }),
  port: config.get('baseDeDatos.puerto', { infer: true }),
  username: config.get('baseDeDatos.usuario', { infer: true }),
  password: config.get('baseDeDatos.clave', { infer: true }),
  database: config.get('baseDeDatos.nombre', { infer: true }),
  entities: [__dirname + '/../**/*.entidad{.ts,.js}'],
  migrations: [__dirname + '/../migraciones/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
