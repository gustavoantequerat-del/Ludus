import { IsEnum, IsOptional, IsUUID, ValidateIf } from 'class-validator';
import { TipoSolicitud } from '../solicitud.entidad';

export class CrearSolicitudDto {
  @IsEnum(TipoSolicitud)
  tipo: TipoSolicitud;

  @ValidateIf((dto) => !dto.rutaId)
  @IsUUID()
  cursoId?: string;

  @ValidateIf((dto) => !dto.cursoId)
  @IsUUID()
  rutaId?: string;
}
