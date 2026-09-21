import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institucion } from './institucion.entidad';
import { Usuario } from '../usuarios/usuario.entidad';
import { Curso } from '../cursos/curso.entidad';
import { InstitucionesService } from './instituciones.service';
import { InstitucionesController } from './instituciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Institucion, Usuario, Curso])],
  providers: [InstitucionesService],
  controllers: [InstitucionesController],
  exports: [InstitucionesService],
})
export class InstitucionesModule {}
