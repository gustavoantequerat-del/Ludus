import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
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

  /** Link de YouTube o de Google Drive. null o vacio: sin video. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoBueno?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  videoMalo?: string | null;
}

export class GuardarHistoriaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
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

  /** Opcional solo para dar un mensaje claro a paquetes SCORM viejos. */
  @IsOptional()
  @IsUUID()
  partidaId?: string;
}

/** La nota sale de lo guardado en la partida; `respuestas` se ignora (paquetes viejos). */
export class TerminarRunnerDto {
  @IsOptional()
  @IsUUID()
  partidaId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAXIMO_PREGUNTAS)
  @ValidateNested({ each: true })
  @Type(() => RespuestaRunnerDto)
  respuestas?: RespuestaRunnerDto[];
}
