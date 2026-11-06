import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Usuario } from '../usuarios/usuario.entidad';

/**
 * Partida de un juego de evaluacion que se corrige en el servidor (Mesa de
 * Cumplimiento y Runner Narrativo; el ajedrez tiene su propia tabla).
 *
 * Guarda que se le dio al estudiante y que respondio: la primera respuesta a
 * cada pregunta es la que vale y la nota sale de aqui, no de lo que mande el
 * navegador al terminar.
 */
@Entity('partidas_juego')
@Index('IDX_partidas_juego_modulo_estudiante', ['moduloId', 'estudianteId'])
export class PartidaJuego {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ModuloCurso, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modulo_id' })
  modulo: ModuloCurso;

  @Column({ name: 'modulo_id', type: 'uuid' })
  moduloId: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Usuario;

  @Column({ name: 'estudiante_id', type: 'uuid' })
  estudianteId: string;

  /** Clave del juego (mesa-cumplimiento, runner-narrativo). */
  @Column({ length: 40 })
  juego: string;

  /**
   * Las preguntas de la partida en orden y la respuesta de cada una:
   * { id, respuesta: null | string, correcta: null | boolean }.
   */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  preguntas: PreguntaDePartida[];

  /** Cuantas ya respondio: una partida con respuestas cuenta como intento aunque la abandone. */
  @Column({ type: 'int', default: 0 })
  respondidas: number;

  @Column({ type: 'boolean', default: false })
  terminada: boolean;

  @CreateDateColumn({ name: 'iniciada_en' })
  iniciadaEn: Date;
}

export interface PreguntaDePartida {
  id: string;
  respuesta: string | null;
  correcta: boolean | null;
}
