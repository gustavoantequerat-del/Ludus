import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaqueteScorm } from './paquete-scorm.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { ConfiguracionJuego } from '../juegos/configuracion-juego.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { AutenticacionModule } from '../autenticacion/autenticacion.module';
import { ResultadosModule } from '../resultados/resultados.module';
import { JuegosModule } from '../juegos/juegos.module';
import { ScormService } from './scorm.service';
import { ScormController } from './scorm.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaqueteScorm, ModuloCurso, ConfiguracionJuego, Inscripcion]),
    AutenticacionModule,
    ResultadosModule,
    JuegosModule,
  ],
  providers: [ScormService],
  controllers: [ScormController],
})
export class ScormModule {}
