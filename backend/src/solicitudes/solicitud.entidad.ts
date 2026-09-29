import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Ruta } from '../rutas/ruta.entidad';

export enum TipoSolicitud {
  INGRESO = 'ingreso',
  SALIDA = 'salida',
}

export enum EstadoSolicitud {
  PENDIENTE = 'pendiente',
  APROBADA = 'aprobada',
  RECHAZADA = 'rechazada',
}

@Entity('solicitudes')
export class Solicitud {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'estudiante_id' })
  estudiante: Usuario;

  @Column({ name: 'estudiante_id', type: 'uuid' })
  estudianteId: string;

  @Column({ type: 'enum', enum: TipoSolicitud })
  tipo: TipoSolicitud;

  @ManyToOne(() => Curso, { nullable: true, onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'curso_id' })
  curso: Curso | null;

  @Column({ name: 'curso_id', type: 'uuid', nullable: true })
  cursoId: string | null;

  @ManyToOne(() => Ruta, { nullable: true, onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'ruta_id' })
  ruta: Ruta | null;

  @Column({ name: 'ruta_id', type: 'uuid', nullable: true })
  rutaId: string | null;

  @Column({
    type: 'enum',
    enum: EstadoSolicitud,
    default: EstadoSolicitud.PENDIENTE,
  })
  estado: EstadoSolicitud;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
