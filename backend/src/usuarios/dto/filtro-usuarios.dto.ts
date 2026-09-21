import { IsEnum, IsOptional } from 'class-validator';
import { Rol } from '../../comun/enums/rol.enum';

export class FiltroUsuariosDto {
  @IsOptional()
  @IsEnum(Rol)
  rol?: Rol;
}
