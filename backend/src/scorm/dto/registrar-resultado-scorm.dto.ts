import { IsInt, Max, Min } from 'class-validator';

export class RegistrarResultadoScormDto {
  @IsInt()
  @Min(0)
  @Max(1000)
  puntaje: number;
}
