import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Juego } from './juego.entidad';
import { ConfiguracionJuego } from './configuracion-juego.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { ResultadosModule } from '../resultados/resultados.module';
import { JuegosService } from './juegos.service';
import { JuegosController } from './juegos.controller';
import { MesaCumplimientoService } from './mesa-cumplimiento/mesa-cumplimiento.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Juego, ConfiguracionJuego, ModuloCurso]),
    ResultadosModule,
  ],
  providers: [JuegosService, MesaCumplimientoService],
  controllers: [JuegosController],
  exports: [JuegosService, MesaCumplimientoService],
})
export class JuegosModule {}
