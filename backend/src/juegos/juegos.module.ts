import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Juego } from './juego.entidad';
import { ConfiguracionJuego } from './configuracion-juego.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Personaje } from '../personajes/personaje.entidad';
import { ResultadosModule } from '../resultados/resultados.module';
import { JuegosService } from './juegos.service';
import { JuegosController } from './juegos.controller';
import { CasoCumplimiento } from './mesa-cumplimiento/caso-cumplimiento.entidad';
import { MesaCumplimientoService } from './mesa-cumplimiento/mesa-cumplimiento.service';
import { CasosService } from './mesa-cumplimiento/casos.service';
import { CasosController } from './mesa-cumplimiento/casos.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Juego,
      ConfiguracionJuego,
      ModuloCurso,
      CasoCumplimiento,
      Personaje,
    ]),
    ResultadosModule,
  ],
  providers: [JuegosService, MesaCumplimientoService, CasosService],
  controllers: [JuegosController, CasosController],
  exports: [JuegosService, MesaCumplimientoService],
})
export class JuegosModule {}
