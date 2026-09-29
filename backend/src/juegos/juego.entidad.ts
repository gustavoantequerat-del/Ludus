import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Catalogo fijo de plantillas de juego programadas por el equipo de
 * desarrollo. No tiene CRUD de usuario: se administra por semilla/migracion.
 */
@Entity('juegos')
export class Juego {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Identificador estable de la plantilla. El frontend y el paquete SCORM lo
   * usan para saber que juego renderizar; "maqueta" son los que todavia no
   * tienen mecanica programada.
   */
  @Index({ unique: true })
  @Column({ length: 60 })
  clave: string;

  @Column({ length: 80 })
  nombre: string;

  @Column({ length: 40 })
  categoria: string;

  @Column({ length: 40 })
  icono: string;

  @Column({ length: 200 })
  eslogan: string;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  parametros: string[];

  /** false mientras el juego siga siendo solo maqueta visual. */
  @Column({ type: 'boolean', default: false })
  jugable: boolean;
}
