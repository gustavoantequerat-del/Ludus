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

/**
 * Un paso de la historia: la pregunta, sus dos respuestas y el video que se ve
 * con cada una.
 *
 * Las opciones viajan al estudiante con un id al azar (no "correcta" /
 * "incorrecta") y mezcladas, asi que mirar la respuesta del servidor no dice
 * cual es la buena.
 */
export interface PreguntaRunner {
  id: string;
  texto: string;
  respuestaCorrecta: string;
  respuestaIncorrecta: string;
  /** Link (YouTube o Drive) del video si acierta: despues llega la siguiente pregunta. */
  videoBueno: string | null;
  /** Link del video si falla: despues la partida se acaba. */
  videoMalo: string | null;
  opcionCorrectaId: string;
  opcionIncorrectaId: string;
}

/**
 * Historia del Runner Narrativo: una intro en video (link de YouTube o Drive)
 * y una cadena de preguntas en el orden en que se juegan. Las preguntas viven
 * en la misma fila (jsonb): siempre se leen y se editan juntas, con su orden.
 */
@Entity('historias')
export class Historia {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 140 })
  nombre: string;

  @Column({ name: 'video_intro', type: 'varchar', length: 500, nullable: true })
  videoIntro: string | null;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  preguntas: PreguntaRunner[];

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
