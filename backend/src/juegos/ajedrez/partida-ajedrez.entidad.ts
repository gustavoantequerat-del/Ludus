import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ModuloCurso } from '../../cursos/modulo-curso.entidad';
import { Usuario } from '../../usuarios/usuario.entidad';

/**
 * Como se pidio la pregunta:
 * - normal: choque de dos piezas que no son reyes; sale cualquiera del banco.
 * - rey: el rey del bot captura; sale una dificil (si hay).
 * - critica: el rey del estudiante captura; dificil, y si falla pierde.
 * - examen: la partida termino con menos de X preguntas y se completan.
 */
export type ModoPregunta = 'normal' | 'rey' | 'critica' | 'examen';

export type Desenlace = 'victoria' | 'derrota' | 'tablas' | 'tiempo' | 'rendicion';

export interface PreguntaHecha {
  preguntaId: string;
  modo: ModoPregunta;
  /** null mientras el estudiante no responde. */
  opcionId: string | null;
  correcta: boolean | null;
}

/**
 * Una partida en curso o terminada. El tablero vive en el navegador; aqui
 * queda lo que define la nota: que preguntas salieron y como se respondieron.
 * Las elige y las corrige el servidor, asi que la nota no se puede inflar
 * desde el navegador.
 */
@Entity('partidas_ajedrez')
export class PartidaAjedrez {
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

  @Index('IDX_partidas_ajedrez_estudiante')
  @Column({ name: 'estudiante_id', type: 'uuid' })
  estudianteId: string;

  /** Sin FK: si el banco se borra, la partida terminada conserva su historial. */
  @Column({ name: 'banco_id', type: 'uuid' })
  bancoId: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  preguntas: PreguntaHecha[];

  /** jugando -> (examen) -> terminada */
  @Column({ length: 12, default: 'jugando' })
  estado: 'jugando' | 'examen' | 'terminada';

  @Column({ type: 'varchar', length: 12, nullable: true })
  desenlace: Desenlace | null;

  /** Copia de las reglas del banco al empezar: editar el banco no cambia una partida en curso. */
  @Column({ type: 'int' })
  minutos: number;

  @Column({ name: 'minimo_preguntas', type: 'int' })
  minimoPreguntas: number;

  /** El estudiante fallo una pregunta critica: no se le dan mas preguntas de juego. */
  @Column({ name: 'critica_fallada', type: 'boolean', default: false })
  criticaFallada: boolean;

  @Column({ type: 'int', nullable: true })
  puntaje: number | null;

  @Column({ type: 'varchar', length: 8, nullable: true })
  nota: string | null;

  @Column({ type: 'int', nullable: true })
  intento: number | null;

  @CreateDateColumn({ name: 'iniciada_en' })
  iniciadaEn: Date;

  @Column({ name: 'terminada_en', type: 'timestamp', nullable: true })
  terminadaEn: Date | null;
}
