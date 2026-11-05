import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const MAXIMO_PREGUNTAS_BANCO = 200;
/** Un banco necesita al menos esto para poder elegirse en un modulo. */
export const MINIMO_PREGUNTAS_BANCO = 10;

export class PreguntaBancoDto {
  /** Vacio en una pregunta nueva; el servidor le asigna uno. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  id?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  texto: string;

  /** Exactamente cuatro textos; el orden aqui no es el que ve el estudiante. */
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  opciones: string[];

  /** Posicion (0 a 3) de la opcion correcta dentro de `opciones`. */
  @IsInt()
  @Min(0)
  @Max(3)
  correcta: number;

  @IsBoolean()
  dificil: boolean;
}

export class GuardarBancoAjedrezDto {
  @IsString()
  @MinLength(2)
  @MaxLength(140)
  nombre: string;

  @IsInt()
  @Min(0)
  @Max(180)
  minutos: number;

  @IsInt()
  @Min(1)
  @Max(50)
  minimoPreguntas: number;

  @IsArray()
  @ArrayMaxSize(MAXIMO_PREGUNTAS_BANCO)
  @ValidateNested({ each: true })
  @Type(() => PreguntaBancoDto)
  preguntas: PreguntaBancoDto[];
}
