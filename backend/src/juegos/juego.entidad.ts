import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Catalogo fijo de plantillas de juego programadas por el equipo de
 * desarrollo. No tiene CRUD de usuario: se administra por semilla/migracion.
 */
@Entity('juegos')
export class Juego {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
}
