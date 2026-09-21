import { PartialType } from '@nestjs/mapped-types';
import { CrearInstitucionDto } from './crear-institucion.dto';

export class ActualizarInstitucionDto extends PartialType(CrearInstitucionDto) {}
