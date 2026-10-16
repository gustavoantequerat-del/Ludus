import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class FiltroAccesosDto {
  @IsOptional()
  @IsUUID()
  usuarioId?: string;

  /** Cuantos dias hacia atras (por defecto 30). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  dias?: number;
}
