import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Institucion } from '../instituciones/institucion.entidad';
import { Usuario } from '../usuarios/usuario.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Ruta } from '../rutas/ruta.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Solicitud } from '../solicitudes/solicitud.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { Resultado } from '../resultados/resultado.entidad';
import { PanelService } from './panel.service';
import { PanelController } from './panel.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Institucion,
      Usuario,
      Curso,
      Ruta,
      ModuloCurso,
      Solicitud,
      Inscripcion,
      Resultado,
    ]),
  ],
  providers: [PanelService],
  controllers: [PanelController],
})
export class PanelModule {}
