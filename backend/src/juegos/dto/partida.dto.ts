import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

const DECISIONES = ['aprobar', 'reforzar', 'rechazar'];

export class RespuestaCasoDto {
  @IsString()
  casoId: string;

  @IsIn(DECISIONES)
  decision: 'aprobar' | 'reforzar' | 'rechazar';
}

/** La decision queda guardada en la partida: la primera es la que vale. */
export class VerificarCasoDto extends RespuestaCasoDto {
  /** Opcional solo para dar un mensaje claro a paquetes SCORM viejos. */
  @IsOptional()
  @IsUUID()
  partidaId?: string;
}

/** La nota sale de lo guardado en la partida; `respuestas` se ignora (paquetes viejos). */
export class TerminarPartidaDto {
  @IsOptional()
  @IsUUID()
  partidaId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RespuestaCasoDto)
  respuestas?: RespuestaCasoDto[];
}
