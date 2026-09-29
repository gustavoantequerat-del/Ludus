import { PartialType } from '@nestjs/mapped-types';
import { CrearCasoDto } from './crear-caso.dto';

export class ActualizarCasoDto extends PartialType(CrearCasoDto) {}
