import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearInstitucionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  @IsString()
  @MinLength(3)
  @MaxLength(160)
  dominio: string;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}
