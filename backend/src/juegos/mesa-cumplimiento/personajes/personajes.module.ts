import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Personaje } from './personaje.entidad';
import { PersonajesService } from './personajes.service';
import { PersonajesController } from './personajes.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Personaje])],
  providers: [PersonajesService],
  controllers: [PersonajesController],
  exports: [PersonajesService],
})
export class PersonajesModule {}
