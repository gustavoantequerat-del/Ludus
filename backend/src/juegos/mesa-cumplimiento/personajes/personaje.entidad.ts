import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Institucion } from '../../../instituciones/institucion.entidad';

/**
 * Persona que aparece en escena frente al jugador (el "CEO" que viene a
 * presentar su expediente).
 *
 * institucionId en null es el catalogo base de Ludus: lo ven todas las
 * instituciones y solo el superadmin lo edita.
 */
@Entity('personajes')
export class Personaje {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  nombre: string;

  @Column({ length: 120, default: '' })
  cargo: string;

  /** Ruta publica de la imagen, tal como la sirve el backend (/archivos/...). */
  @Column({ length: 300 })
  imagen: string;

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
