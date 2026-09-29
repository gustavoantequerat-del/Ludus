import { PartialType } from '@nestjs/mapped-types';
import { CrearModuloDto } from './crear-modulo.dto';

export class ActualizarModuloDto extends PartialType(CrearModuloDto) {}
