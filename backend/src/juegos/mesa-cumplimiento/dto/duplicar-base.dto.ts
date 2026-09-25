import { ArrayNotEmpty, IsArray, IsOptional, IsUUID } from 'class-validator';

export class DuplicarBaseDto {
  /**
   * Cuales casos del catalogo base copiar. Sin esto se copian todos, que es
   * el atajo para arrancar; con esto el docente elige de a uno y convive con
   * los que ya escribio.
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  ids?: string[];
}
