import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Juego } from './juego.entidad';
import { ConfiguracionJuego } from './configuracion-juego.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Personaje } from './mesa-cumplimiento/personajes/personaje.entidad';
import { ResultadosModule } from '../resultados/resultados.module';
import { JuegosService } from './juegos.service';
import { JuegosController } from './juegos.controller';
import { AccesoModuloService } from './acceso-modulo.service';
import { CasoCumplimiento } from './mesa-cumplimiento/caso-cumplimiento.entidad';
import { MesaCumplimientoService } from './mesa-cumplimiento/mesa-cumplimiento.service';
import { CasosService } from './mesa-cumplimiento/casos.service';
import { CasosController } from './mesa-cumplimiento/casos.controller';
import { Mazo } from './fichas/mazo.entidad';
import { MazosService } from './fichas/mazos.service';
import { MazosController } from './fichas/mazos.controller';
import { FichasService } from './fichas/fichas.service';
import { FichasController } from './fichas/fichas.controller';
import { Historia } from './runner/historia.entidad';
import { HistoriasService } from './runner/historias.service';
import { HistoriasController } from './runner/historias.controller';
import { RunnerService } from './runner/runner.service';
import { RunnerController } from './runner/runner.controller';
import { BancoAjedrez } from './ajedrez/banco-ajedrez.entidad';
import { PartidaAjedrez } from './ajedrez/partida-ajedrez.entidad';
import { BancosAjedrezService } from './ajedrez/bancos-ajedrez.service';
import { BancosAjedrezController } from './ajedrez/bancos-ajedrez.controller';
import { AjedrezService } from './ajedrez/ajedrez.service';
import { AjedrezController } from './ajedrez/ajedrez.controller';
import { PartidaJuego } from './partida-juego.entidad';
import { PartidasJuegoService } from './partidas-juego.service';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Juego,
      ConfiguracionJuego,
      ModuloCurso,
      CasoCumplimiento,
      Personaje,
      Mazo,
      Historia,
      BancoAjedrez,
      PartidaAjedrez,
      PartidaJuego,
      Inscripcion,
    ]),
    ResultadosModule,
  ],
  providers: [
    JuegosService,
    AccesoModuloService,
    MesaCumplimientoService,
    CasosService,
    MazosService,
    FichasService,
    HistoriasService,
    RunnerService,
    BancosAjedrezService,
    AjedrezService,
    PartidasJuegoService,
  ],
  controllers: [
    JuegosController,
    CasosController,
    MazosController,
    FichasController,
    HistoriasController,
    RunnerController,
    BancosAjedrezController,
    AjedrezController,
  ],
  exports: [JuegosService, MesaCumplimientoService, FichasService, RunnerService, AjedrezService],
})
export class JuegosModule {}
