import 'reflect-metadata';
import { config as cargarEnv } from 'dotenv';
import { DataSource } from 'typeorm';

cargarEnv();

const datosOrigen = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PUERTO) || 5432,
  username: process.env.DB_USUARIO || 'sistema_juegos',
  password: process.env.DB_CLAVE || 'sistema_juegos',
  database: process.env.DB_NOMBRE || 'sistema_juegos',
  entities: [__dirname + '/../**/*.entidad{.ts,.js}'],
  migrations: [__dirname + '/../migraciones/*{.ts,.js}'],
  synchronize: false,
});

export default datosOrigen;
