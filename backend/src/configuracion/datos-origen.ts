import 'reflect-metadata';
import { config as cargarEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { opcionesDeConexion } from './conexion-bd';

cargarEnv();

const datosOrigen = new DataSource({
  type: 'postgres',
  ...opcionesDeConexion(),
  entities: [__dirname + '/../**/*.entidad{.ts,.js}'],
  migrations: [__dirname + '/../migraciones/*{.ts,.js}'],
  synchronize: false,
});

export default datosOrigen;
