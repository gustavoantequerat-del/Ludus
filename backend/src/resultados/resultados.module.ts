import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Resultado } from './resultado.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { ConfiguracionJuego } from '../juegos/configuracion-juego.entidad';
import { ResultadosService } from './resultados.service';
import { ResultadosController } from './resultados.controller';
import { IntentosService } from './intentos.service';
import { PartidaJuego } from '../juegos/partida-juego.entidad';
import { PartidaAjedrez } from '../juegos/ajedrez/partida-ajedrez.entidad';

@Module({
  imports: [TypeOrmModule.forFeature([
      Resultado,
      ModuloCurso,
      Inscripcion,
      ConfiguracionJuego,
      PartidaJuego,
      PartidaAjedrez,
    ]),
  ],
  providers: [ResultadosService, IntentosService],
  controllers: [ResultadosController],
  exports: [ResultadosService, IntentosService],
})
export class ResultadosModule {}
