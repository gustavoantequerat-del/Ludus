import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, ValidateNested } from 'class-validator';

const DECISIONES = ['aprobar', 'reforzar', 'rechazar'];

export class RespuestaCasoDto {
  @IsString()
  casoId: string;

  @IsIn(DECISIONES)
  decision: 'aprobar' | 'reforzar' | 'rechazar';
}

export class VerificarCasoDto extends RespuestaCasoDto {}

export class TerminarPartidaDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RespuestaCasoDto)
  respuestas: RespuestaCasoDto[];
}
