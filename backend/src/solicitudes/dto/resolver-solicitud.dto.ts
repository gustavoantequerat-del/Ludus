import { IsIn } from 'class-validator';

export class ResolverSolicitudDto {
  @IsIn(['aprobada', 'rechazada'])
  estado: 'aprobada' | 'rechazada';
}
