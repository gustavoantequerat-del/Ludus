import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearModuloDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  califica?: boolean;
}
