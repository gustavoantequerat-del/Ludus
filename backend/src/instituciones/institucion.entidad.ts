import {
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
