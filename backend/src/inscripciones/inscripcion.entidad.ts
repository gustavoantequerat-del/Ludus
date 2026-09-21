import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Ruta } from '../rutas/ruta.entidad';

/**
 * Un estudiante inscrito en un curso o en una ruta (no ambos a la vez en el
 * mismo registro). El curso es independiente de las rutas; una ruta agrupa
 * cursos que ya existen.
 */
@Entity('inscripciones')
export class Inscripcion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Usuario;

  @Column({ name: 'estudiante_id', type: 'uuid' })
  estudianteId: string;

  @ManyToOne(() => Curso, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso | null;

  @Column({ name: 'curso_id', type: 'uuid', nullable: true })
  cursoId: string | null;

  @ManyToOne(() => Ruta, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruta_id' })
  ruta: Ruta | null;

  @Column({ name: 'ruta_id', type: 'uuid', nullable: true })
  rutaId: string | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
