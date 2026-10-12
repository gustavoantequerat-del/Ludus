import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const MAXIMO_PREGUNTAS = 100;

export class PreguntaHistoriaDto {
  /** Vacio en una pregunta nueva; el servidor le asigna uno. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  texto: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  respuestaCorrecta: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  respuestaIncorrecta: string;

  /** Ruta que devolvio la subida de video. null o vacio: sin video. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  videoBueno?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  videoMalo?: string | null;
}

export class GuardarHistoriaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  videoIntro?: string | null;

  @IsArray()
  @ArrayMaxSize(MAXIMO_PREGUNTAS)
  @ValidateNested({ each: true })
  @Type(() => PreguntaHistoriaDto)
  preguntas: PreguntaHistoriaDto[];
}

export class RespuestaRunnerDto {
  @IsString()
  @MaxLength(60)
  preguntaId: string;

  @IsString()
  @MaxLength(60)
  opcionId: string;
}

export class TerminarRunnerDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAXIMO_PREGUNTAS)
  @ValidateNested({ each: true })
  @Type(() => RespuestaRunnerDto)
  respuestas: RespuestaRunnerDto[];
}
