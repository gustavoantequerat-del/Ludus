import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class CrearResultadoDto {
  @IsUUID()
  moduloId: string;

  @IsInt()
  @Min(0)
  @Max(1000)
  puntaje: number;
}
