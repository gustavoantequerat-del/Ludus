import { IsUUID } from 'class-validator';

export class AgregarCursoRutaDto {
  @IsUUID()
  cursoId: string;
}
