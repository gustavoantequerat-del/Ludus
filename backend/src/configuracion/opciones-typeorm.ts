import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { opcionesDeConexion } from './conexion-bd';

export const construirOpcionesTypeOrm = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  ...opcionesDeConexion(),
  entities: [__dirname + '/../**/*.entidad{.ts,.js}'],
  migrations: [__dirname + '/../migraciones/*{.ts,.js}'],
  synchronize: false,
  logging: false,
});
