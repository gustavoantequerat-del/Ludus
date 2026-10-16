import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from '../usuarios/usuario.entidad';

/** Por donde entro: el login de Ludus, el boton de Google o un paquete SCORM. */
export type MetodoAcceso = 'clave' | 'google' | 'scorm';

/**
 * Un inicio de sesion exitoso. Es el registro propio de "que cuenta entro y
 * cuando": Google Analytics no puede guardarlo porque sus condiciones
 * prohiben enviarle correos o nombres.
 */
@Entity('accesos')
export class Acceso {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Usuario, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @Index('IDX_accesos_usuario')
  @Column({ name: 'usuario_id', type: 'uuid' })
  usuarioId: string;

  @Column({ length: 12 })
  metodo: MetodoAcceso;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  agente: string | null;

  @Index('IDX_accesos_creado_en')
  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;
}
