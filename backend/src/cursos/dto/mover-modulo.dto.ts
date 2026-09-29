import { IsIn } from 'class-validator';

export class MoverModuloDto {
  @IsIn(['arriba', 'abajo'])
  direccion: 'arriba' | 'abajo';
}
