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
import { Rol } from '../comun/enums/rol.enum';
import { Institucion } from '../instituciones/institucion.entidad';

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  nombre: string;

  @Index({ unique: true })
  @Column({ length: 160 })
  correo: string;

  @Column({ name: 'clave_hash', length: 200, select: false })
  claveHash: string;

  @Column({ type: 'enum', enum: Rol })
  rol: Rol;

  @ManyToOne(() => Institucion, (institucion) => institucion.usuarios, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'institucion_id' })
  institucion: Institucion | null;

  @Column({ name: 'institucion_id', type: 'uuid', nullable: true })
  institucionId: string | null;

  @Column({ type: 'boolean', default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
