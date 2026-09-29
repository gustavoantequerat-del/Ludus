import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Institucion } from '../instituciones/institucion.entidad';
import { RutaCurso } from './ruta-curso.entidad';

@Entity('rutas')
export class Ruta {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 140 })
  nombre: string;

  @Column({ type: 'text', default: '' })
  descripcion: string;

  @ManyToOne(() => Institucion, (institucion) => institucion.rutas, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'institucion_id' })
  institucion: Institucion;

  @Column({ name: 'institucion_id', type: 'uuid' })
  institucionId: string;

  @OneToMany(() => RutaCurso, (rutaCurso) => rutaCurso.ruta, { cascade: true })
  cursos: RutaCurso[];

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
