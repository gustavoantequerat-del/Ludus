import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Institucion } from '../../instituciones/institucion.entidad';

export interface OpcionAjedrez {
  id: string;
  texto: string;
}

/**
 * Una pregunta del banco: cuatro opciones y una sola correcta. Las dificiles
 * son las que salen cuando un rey entra en la captura (y tambien pueden salir
 * en una captura normal).
 */
export interface PreguntaAjedrez {
  id: string;
  texto: string;
  opciones: OpcionAjedrez[];
  correctaId: string;
  dificil: boolean;
}

/**
 * Banco de preguntas del Ajedrez de Preguntas, con las reglas de la partida:
 * minutos (0 = sin limite) y el minimo de preguntas para calificar sin modo
 * examen. Las preguntas viven en la misma fila (jsonb): siempre se leen y se
 * editan juntas.
 */
@Entity('bancos_ajedrez')
export class BancoAjedrez {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 140 })
  nombre: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  preguntas: PreguntaAjedrez[];

  /** Duracion de la partida en minutos; 0 = sin limite. */
  @Column({ type: 'int', default: 0 })
  minutos: number;

  /** X: si a la partida le salieron menos preguntas, se completa en modo examen. */
  @Column({ name: 'minimo_preguntas', type: 'int', default: 5 })
  minimoPreguntas: number;

  @ManyToOne(() => Institucion, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'institucion_id' })
  institucion: Institucion | null;

  @Column({ name: 'institucion_id', type: 'uuid', nullable: true })
  institucionId: string | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
