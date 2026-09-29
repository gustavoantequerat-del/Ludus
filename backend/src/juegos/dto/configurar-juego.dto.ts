import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class ConfigurarJuegoDto {
  @IsUUID()
  juegoId: string;

  @IsString()
  @MaxLength(140)
  titulo: string;

  @IsOptional()
  @IsString()
  instrucciones?: string;

  @IsIn(['baja', 'media', 'alta'])
  velocidad: 'baja' | 'media' | 'alta';

  @IsInt()
  @Min(30)
  @Max(600)
  tiempoLimiteSegundos: number;

  @IsInt()
  @Min(4)
  @Max(24)
  paresContenido: number;

  @IsInt()
  @Min(1)
  @Max(5)
  intentosPermitidos: number;

  @IsInt()
  @Min(10)
  @Max(200)
  puntajeMaximo: number;

  @IsOptional()
  @IsBoolean()
  califica?: boolean;
}
