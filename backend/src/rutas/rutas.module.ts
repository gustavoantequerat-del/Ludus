import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ruta } from './ruta.entidad';
import { RutaCurso } from './ruta-curso.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { RutasService } from './rutas.service';
import { RutasController } from './rutas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Ruta, RutaCurso, Curso, Inscripcion])],
  providers: [RutasService],
  controllers: [RutasController],
  exports: [RutasService],
})
export class RutasModule {}
