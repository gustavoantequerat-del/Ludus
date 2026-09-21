import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CrearCursoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  /** Solo superadmin puede elegir institucion; el resto usa la propia. */
  @IsOptional()
  @IsUUID()
  institucionId?: string;

  /** Docente asignado. Si quien crea es docente, se usa su propio id. */
  @IsOptional()
  @IsUUID()
  docenteId?: string;
}
