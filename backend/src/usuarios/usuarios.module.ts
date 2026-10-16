import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './usuario.entidad';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { Institucion } from '../instituciones/institucion.entidad';
import { ImportacionUsuariosService } from './importacion/importacion-usuarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Institucion])],
  providers: [UsuariosService, ImportacionUsuariosService],
  controllers: [UsuariosController],
  exports: [UsuariosService],
})
export class UsuariosModule {}
