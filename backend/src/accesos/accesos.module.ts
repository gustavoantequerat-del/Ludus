import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Acceso } from './acceso.entidad';
import { AccesosService } from './accesos.service';
import { AccesosController } from './accesos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Acceso])],
  providers: [AccesosService],
  controllers: [AccesosController],
  exports: [AccesosService],
})
export class AccesosModule {}
