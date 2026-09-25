import { PartialType } from '@nestjs/mapped-types';
import { CrearPersonajeDto } from './crear-personaje.dto';

export class ActualizarPersonajeDto extends PartialType(CrearPersonajeDto) {}
