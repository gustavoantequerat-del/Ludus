import { IsUUID } from 'class-validator';

export class CrearPaqueteDto {
  @IsUUID()
  moduloId: string;
}
