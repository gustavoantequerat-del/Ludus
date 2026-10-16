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
   * usan para saber que juego renderizar.
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

  /**
   * Si el juego tiene mecanica programada. Hoy todos los del catalogo la
   * tienen (las maquetas se quitaron en la migracion QuitarJuegosMaqueta); se
   * conserva para poder sumar una plantilla en preparacion sin mostrarla rota.
   */
  @Column({ type: 'boolean', default: false })
  jugable: boolean;

  /**
   * Sector del catalogo. Un juego de evaluacion mide lo aprendido en el curso
   * y puede calificar; uno ludico es para pasar el rato y nunca califica.
   */
  @Column({ type: 'varchar', length: 12, default: 'evaluacion' })
  tipo: TipoJuego;
}

export type TipoJuego = 'evaluacion' | 'ludico';
