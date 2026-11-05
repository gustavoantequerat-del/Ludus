import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Usuario } from '../usuarios/usuario.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Ruta } from '../rutas/ruta.entidad';
import { generarCodigo } from './codigo-registro';

@Entity('instituciones')
export class Institucion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 120 })
  nombre: string;

  @Column({ length: 160, unique: true })
  dominio: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  /**
   * Codigo para que los estudiantes nuevos se registren solos en esta
   * institucion. No se manda en las respuestas normales (select: false): solo
   * lo ven el superadmin y el admin de la institucion, en su propio endpoint.
   */
  @Column({ name: 'codigo_registro', type: 'varchar', length: 12, unique: true, select: false })
  codigoRegistro: string;

  @BeforeInsert()
  asignarCodigo() {
    this.codigoRegistro ??= generarCodigo();
  }

  @OneToMany(() => Usuario, (usuario) => usuario.institucion)
  usuarios: Usuario[];

  @OneToMany(() => Curso, (curso) => curso.institucion)
  cursos: Curso[];

  @OneToMany(() => Ruta, (ruta) => ruta.institucion)
  rutas: Ruta[];

  @CreateDateColumn({ name: 'creado_en' })
  creadoEn: Date;

  @UpdateDateColumn({ name: 'actualizado_en' })
  actualizadoEn: Date;
}
