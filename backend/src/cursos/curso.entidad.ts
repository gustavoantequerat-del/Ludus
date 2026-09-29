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
import { Usuario } from '../usuarios/usuario.entidad';
import { ModuloCurso } from './modulo-curso.entidad';

@Entity('cursos')
export class Curso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 140 })
  nombre: string;

  @Column({ type: 'text', default: '' })
  descripcion: string;

  @ManyToOne(() => Institucion, (institucion) => institucion.cursos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'institucion_id' })
  institucion: Institucion;

  @Column({ name: 'institucion_id', type: 'uuid' })
  institucionId: string;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'docente_id' })
  docente: Usuario | null;

  @Column({ name: 'docente_id', type: 'uuid', nullable: true })
  docenteId: string | null;

  @OneToMany(() => ModuloCurso, (modulo) => modulo.curso, { cascade: true })
  modulos: ModuloCurso[];

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
