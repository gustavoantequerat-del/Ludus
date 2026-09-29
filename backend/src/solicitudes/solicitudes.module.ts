import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Solicitud } from './solicitud.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Ruta } from '../rutas/ruta.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudesController } from './solicitudes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Solicitud, Curso, Ruta, Inscripcion])],
  providers: [SolicitudesService],
  controllers: [SolicitudesController],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
