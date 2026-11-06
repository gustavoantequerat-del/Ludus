import { IsIn, IsString, MaxLength } from 'class-validator';
import { Desenlace, ModoPregunta } from '../partida-ajedrez.entidad';

export class PedirPreguntaDto {
  /** examen no se pide: lo decide el servidor segun el estado de la partida. */
  @IsIn(['normal', 'rey', 'critica'])
  modo: Exclude<ModoPregunta, 'examen'>;
}

export class ResponderPreguntaDto {
  @IsString()
  @MaxLength(60)
  preguntaId: string;

  @IsString()
  @MaxLength(60)
  opcionId: string;
}

export class TerminarAjedrezDto {
  @IsIn(['victoria', 'derrota', 'tablas', 'tiempo', 'rendicion', 'examen'])
  desenlace: Desenlace;
}
