import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resultado } from './resultado.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { ResultadosService } from './resultados.service';
import { ResultadosController } from './resultados.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Resultado, ModuloCurso, Inscripcion])],
  providers: [ResultadosService],
  controllers: [ResultadosController],
  exports: [ResultadosService],
})
export class ResultadosModule {}
