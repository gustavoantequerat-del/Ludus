import { OmitType, PartialType } from '@nestjs/mapped-types';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CLAVE_MAHJONG, CLAVE_MEMORAMA } from '../../catalogo-nuevos';

export const MINIMO_ICONOS_MAZO = 4;
export const MAXIMO_ICONOS_MAZO = 60;

export class CrearMazoDto {
  @IsIn([CLAVE_MEMORAMA, CLAVE_MAHJONG])
  juegoClave: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  nombre: string;

  /** Rutas que devolvio la subida de imagenes (/archivos/fichas/...). */
  @IsArray()
  @ArrayMinSize(MINIMO_ICONOS_MAZO)
  @ArrayMaxSize(MAXIMO_ICONOS_MAZO)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  iconos: string[];

  /** Dorso de la carta (Memorama) o cuerpo de la ficha (Mahjong). null la quita. */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  imagenFicha?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  fondo?: string | null;
}

export class ActualizarMazoDto extends PartialType(OmitType(CrearMazoDto, ['juegoClave'] as const)) {}

export class SubirImagenMazoDto {
  /** data URL (data:image/png;base64,...). */
  @IsString()
  imagen: string;

  /** El fondo va a su carpeta; iconos y fichas, a la de fichas. */
  @IsIn(['icono', 'ficha', 'fondo'])
  uso: 'icono' | 'ficha' | 'fondo';
}
