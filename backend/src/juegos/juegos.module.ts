import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Juego } from './juego.entidad';
import { ConfiguracionJuego } from './configuracion-juego.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { JuegosService } from './juegos.service';
import { JuegosController } from './juegos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Juego, ConfiguracionJuego, ModuloCurso])],
  providers: [JuegosService],
  controllers: [JuegosController],
  exports: [JuegosService],
})
export class JuegosModule {}
