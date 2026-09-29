import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Curso } from './curso.entidad';
import { ConfiguracionJuego } from '../juegos/configuracion-juego.entidad';

@Entity('modulos_curso')
export class ModuloCurso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Curso, (curso) => curso.modulos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso;

  @Column({ name: 'curso_id', type: 'uuid' })
  cursoId: string;

  @Column({ length: 140 })
  titulo: string;

  @Column({ type: 'text', default: '' })
  descripcion: string;

  @Column({ type: 'int' })
  orden: number;

  @Column({ type: 'boolean', default: true })
  califica: boolean;

  @OneToOne(() => ConfiguracionJuego, (configuracion) => configuracion.modulo, {
    nullable: true,
  })
  configuracionJuego: ConfiguracionJuego | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
