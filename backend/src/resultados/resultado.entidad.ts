import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';

@Entity('resultados')
export class Resultado {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Usuario;

  @Column({ name: 'estudiante_id', type: 'uuid' })
  estudianteId: string;

  @ManyToOne(() => ModuloCurso, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'modulo_id' })
  modulo: ModuloCurso;

  @Column({ name: 'modulo_id', type: 'uuid' })
  moduloId: string;

  @Column({ type: 'int' })
  intento: number;

  @Column({ type: 'int' })
  puntaje: number;

  @Column({ type: 'numeric', precision: 4, scale: 1, nullable: true })
  nota: string | null;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
