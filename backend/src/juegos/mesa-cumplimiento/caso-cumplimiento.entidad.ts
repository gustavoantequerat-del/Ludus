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
import { Personaje } from './personajes/personaje.entidad';

export type Decision = 'aprobar' | 'reforzar' | 'rechazar';

export interface CampoExpediente {
  etiqueta: string;
  valor: string;
}

/**
 * Un expediente de la Mesa de Cumplimiento: la solicitud que trae el CEO y la
 * decision que correspondia, con la explicacion que se muestra despues.
 *
 * Los seis campos del expediente son fijos porque son los que el curso usa
 * para decidir. Lo que no entra en esos seis va en camposExtra, para casos que
 * necesitan datos propios (hops, materialidad, modelo operativo).
 *
 * institucionId en null es el catalogo base de Ludus, comun a todos.
 */
@Entity('casos_cumplimiento')
export class CasoCumplimiento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 160 })
  entidad: string;

  @Column({ length: 160, default: '' })
  tipo: string;

  @Column({ length: 160, default: '' })
  jurisdiccion: string;

  @Column({ length: 200, default: '' })
  solicitud: string;

  /* --- Campos del expediente --- */

  @Column({ name: 'registro_licencia', type: 'text', default: '' })
  registroLicencia: string;

  @Column({ name: 'travel_rule', type: 'text', default: '' })
  travelRule: string;

  @Column({ name: 'beneficiario_final', type: 'text', default: '' })
  beneficiarioFinal: string;

  @Column({ name: 'controles_aml', type: 'text', default: '' })
  controlesAml: string;

  @Column({ type: 'text', default: '' })
  sanciones: string;

  @Column({ name: 'exposicion_onchain', type: 'text', default: '' })
  exposicionOnchain: string;

  @Column({ name: 'campos_extra', type: 'jsonb', default: '[]' })
  camposExtra: CampoExpediente[];

  /* --- Respuesta y retroalimentacion --- */

  @Column({ name: 'decision_correcta', length: 12 })
  decisionCorrecta: Decision;

  @Column({ length: 200, default: '' })
  regla: string;

  @Column({ type: 'text', default: '' })
  explicacion: string;

  @Column({ length: 160, default: '' })
  origen: string;

  /* --- Escena --- */

  @ManyToOne(() => Personaje, { onDelete: 'SET NULL', nullable: true, eager: true })
  @JoinColumn({ name: 'personaje_id' })
  personaje: Personaje | null;

  @Column({ name: 'personaje_id', type: 'uuid', nullable: true })
  personajeId: string | null;

  /* --- Alcance --- */

  @ManyToOne(() => Institucion, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'institucion_id' })
  institucion: Institucion | null;

  @Column({ name: 'institucion_id', type: 'uuid', nullable: true })
  institucionId: string | null;

  @Column({ default: true })
  activo: boolean;

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
