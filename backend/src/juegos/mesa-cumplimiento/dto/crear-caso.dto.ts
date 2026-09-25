import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CampoExpedienteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  etiqueta: string;

  @IsString()
  @MaxLength(400)
  valor: string;
}

export class CrearCasoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  entidad: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  jurisdiccion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  solicitud?: string;

  /* --- Los seis campos del expediente --- */

  @IsOptional()
  @IsString()
  registroLicencia?: string;

  @IsOptional()
  @IsString()
  travelRule?: string;

  @IsOptional()
  @IsString()
  beneficiarioFinal?: string;

  @IsOptional()
  @IsString()
  controlesAml?: string;

  @IsOptional()
  @IsString()
  sanciones?: string;

  @IsOptional()
  @IsString()
  exposicionOnchain?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampoExpedienteDto)
  camposExtra?: CampoExpedienteDto[];

  /* --- Respuesta y retroalimentacion --- */

  @IsIn(['aprobar', 'reforzar', 'rechazar'])
  decisionCorrecta: 'aprobar' | 'reforzar' | 'rechazar';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  regla?: string;

  @IsOptional()
  @IsString()
  explicacion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  origen?: string;

  /** Personaje que aparece en escena; null deja la silueta neutra. */
  @IsOptional()
  @IsUUID()
  personajeId?: string | null;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
