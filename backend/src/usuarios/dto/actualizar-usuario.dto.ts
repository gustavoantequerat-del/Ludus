import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CrearUsuarioDto } from './crear-usuario.dto';

export class ActualizarUsuarioDto extends PartialType(
  OmitType(CrearUsuarioDto, ['clave'] as const),
) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
