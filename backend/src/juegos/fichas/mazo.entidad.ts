import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Institucion } from '../../instituciones/institucion.entidad';

/**
 * El aspecto de un juego de fichas: los iconos que se emparejan, la imagen de
 * la ficha y el fondo de la mesa.
 *
 * Lo comparten el Memorama y el Mahjong; juegoClave dice de cual es. En el
 * Memorama imagenFicha es el dorso de la carta; en el Mahjong, el cuerpo de la
 * ficha sobre el que va el icono. Sin imagen, el juego dibuja la suya.
 *
 * institucionId en null es el catalogo base de Ludus: lo ven todas las
 * instituciones y solo el superadmin lo edita.
 */
@Entity('mazos')
export class Mazo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'juego_clave', length: 60 })
  juegoClave: string;

  @Column({ length: 120 })
  nombre: string;

  /** Rutas publicas (/archivos/...) de los iconos, en orden. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  iconos: string[];

  @Column({ name: 'imagen_ficha', type: 'varchar', length: 300, nullable: true })
  imagenFicha: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  fondo: string | null;

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
