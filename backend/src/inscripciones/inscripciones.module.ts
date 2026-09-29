import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inscripcion } from './inscripcion.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Ruta } from '../rutas/ruta.entidad';
import { Usuario } from '../usuarios/usuario.entidad';
import { InscripcionesService } from './inscripciones.service';
import { InscripcionesController } from './inscripciones.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Inscripcion, Curso, Ruta, Usuario])],
  providers: [InscripcionesService],
  controllers: [InscripcionesController],
  exports: [InscripcionesService],
})
export class InscripcionesModule {}
