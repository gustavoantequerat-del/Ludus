import { IsArray, IsUUID } from 'class-validator';

export class AsignarEstudiantesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  estudianteIds: string[];
}
