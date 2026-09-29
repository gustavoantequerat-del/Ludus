import { PartialType } from '@nestjs/mapped-types';
import { CrearRutaDto } from './crear-ruta.dto';

export class ActualizarRutaDto extends PartialType(CrearRutaDto) {}
