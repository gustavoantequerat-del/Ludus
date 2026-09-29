import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Usuario } from '../usuarios/usuario.entidad';

/**
 * Paquete SCORM generado para un modulo. El token viaja dentro del ZIP que se
 * sube al LMS externo, asi que es un identificador publico: no da acceso por si
 * solo, el estudiante siempre tiene que iniciar sesion con su cuenta de Ludus.
 */
@Entity('paquetes_scorm')
export class PaqueteScorm {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ length: 64 })
  token: string;

  @ManyToOne(() => ModuloCurso, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'modulo_id' })
  modulo: ModuloCurso;

  @Column({ name: 'modulo_id', type: 'uuid' })
  moduloId: string;

  @ManyToOne(() => Usuario, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creado_por_id' })
  creadoPor: Usuario | null;

  @Column({ name: 'creado_por_id', type: 'uuid', nullable: true })
  creadoPorId: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
