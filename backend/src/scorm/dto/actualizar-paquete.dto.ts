import { IsBoolean } from 'class-validator';

export class ActualizarPaqueteDto {
  @IsBoolean()
  activo: boolean;
}
