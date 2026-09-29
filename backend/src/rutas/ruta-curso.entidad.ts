import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ruta } from './ruta.entidad';
import { Curso } from '../cursos/curso.entidad';

@Entity('rutas_cursos')
export class RutaCurso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Ruta, (ruta) => ruta.cursos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruta_id' })
  ruta: Ruta;

  @Column({ name: 'ruta_id', type: 'uuid' })
  rutaId: string;

  @ManyToOne(() => Curso, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @Column({ name: 'curso_id', type: 'uuid' })
  cursoId: string;

  @Column({ type: 'int' })
  orden: number;
}
