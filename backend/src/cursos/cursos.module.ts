import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Curso } from './curso.entidad';
import { ModuloCurso } from './modulo-curso.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { Usuario } from '../usuarios/usuario.entidad';
import { CursosService } from './cursos.service';
import { CursosController } from './cursos.controller';
import { RankingCursoService } from './ranking-curso.service';
import { Resultado } from '../resultados/resultado.entidad';

@Module({
  imports: [TypeOrmModule.forFeature([Curso, ModuloCurso, Inscripcion, Usuario, Resultado])],
  providers: [CursosService, RankingCursoService],
  controllers: [CursosController],
  exports: [CursosService],
})
export class CursosModule {}
