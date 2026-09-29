import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { Rol } from '../../comun/enums/rol.enum';

export class CrearUsuarioDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @IsString()
  @MaxLength(160)
  correo: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  clave: string;

  @IsEnum(Rol)
  rol: Rol;

  @IsOptional()
  @IsUUID()
  institucionId?: string;
}
