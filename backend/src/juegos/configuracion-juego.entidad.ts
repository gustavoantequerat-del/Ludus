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
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Juego } from './juego.entidad';

export type Velocidad = 'baja' | 'media' | 'alta';

@Entity('configuraciones_juego')
export class ConfiguracionJuego {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => ModuloCurso, (modulo) => modulo.configuracionJuego, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'modulo_id' })
  modulo: ModuloCurso;

  @Column({ name: 'modulo_id', type: 'uuid', unique: true })
  moduloId: string;

  @ManyToOne(() => Juego, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'juego_id' })
  juego: Juego;

  @Column({ name: 'juego_id', type: 'uuid' })
  juegoId: string;

  @Column({ length: 140 })
  titulo: string;

  @Column({ name: 'instrucciones', type: 'text', default: '' })
  instrucciones: string;

  @Column({ type: 'varchar', length: 10, default: 'media' })
  velocidad: Velocidad;

  @Column({ name: 'tiempo_limite_segundos', type: 'int', default: 180 })
  tiempoLimiteSegundos: number;

  @Column({ name: 'pares_contenido', type: 'int', default: 8 })
  paresContenido: number;

  @Column({ name: 'intentos_permitidos', type: 'int', default: 3 })
  intentosPermitidos: number;

  @Column({ name: 'puntaje_maximo', type: 'int', default: 100 })
  puntajeMaximo: number;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
