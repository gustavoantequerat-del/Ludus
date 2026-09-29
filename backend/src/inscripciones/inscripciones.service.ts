import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Inscripcion } from './inscripcion.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Ruta } from '../rutas/ruta.entidad';
import { Usuario } from '../usuarios/usuario.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';

@Injectable()
export class InscripcionesService {
  constructor(
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepo: Repository<Inscripcion>,
    @InjectRepository(Curso)
    private readonly cursosRepo: Repository<Curso>,
    @InjectRepository(Ruta)
    private readonly rutasRepo: Repository<Ruta>,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
  ) {}

  async listarDeCurso(quien: UsuarioAutenticado, cursoId: string): Promise<Inscripcion[]> {
    const curso = await this.cursoConAcceso(quien, cursoId);
    return this.inscripcionesRepo.find({
      where: { cursoId: curso.id },
      relations: ['estudiante'],
    });
  }

  async listarDeRuta(quien: UsuarioAutenticado, rutaId: string): Promise<Inscripcion[]> {
    const ruta = await this.rutaConAcceso(quien, rutaId);
    return this.inscripcionesRepo.find({
      where: { rutaId: ruta.id },
      relations: ['estudiante'],
    });
  }

  /** Reemplaza la lista completa de estudiantes inscritos en un curso. */
  async asignarACurso(
    quien: UsuarioAutenticado,
    cursoId: string,
    estudianteIds: string[],
  ): Promise<Inscripcion[]> {
    const curso = await this.cursoConAcceso(quien, cursoId);
    await this.verificarEstudiantesDeInstitucion(curso.institucionId, estudianteIds);
    await this.inscripcionesRepo.delete({ cursoId: curso.id });
    const nuevas = estudianteIds.map((estudianteId) =>
      this.inscripcionesRepo.create({ cursoId: curso.id, estudianteId }),
    );
    return nuevas.length ? this.inscripcionesRepo.save(nuevas) : [];
  }

  /** Reemplaza la lista completa de estudiantes inscritos en una ruta. */
  async asignarARuta(
    quien: UsuarioAutenticado,
    rutaId: string,
    estudianteIds: string[],
  ): Promise<Inscripcion[]> {
    const ruta = await this.rutaConAcceso(quien, rutaId);
    await this.verificarEstudiantesDeInstitucion(ruta.institucionId, estudianteIds);
    await this.inscripcionesRepo.delete({ rutaId: ruta.id });
    const nuevas = estudianteIds.map((estudianteId) =>
      this.inscripcionesRepo.create({ rutaId: ruta.id, estudianteId }),
    );
    return nuevas.length ? this.inscripcionesRepo.save(nuevas) : [];
  }

  private async cursoConAcceso(quien: UsuarioAutenticado, cursoId: string): Promise<Curso> {
    const curso = await this.cursosRepo.findOne({ where: { id: cursoId } });
    if (!curso) throw new NotFoundException('Curso no encontrado');
    if (quien.rol === Rol.SUPERADMIN) return curso;
    if (quien.rol === Rol.ESTUDIANTE) {
      throw new ForbiddenException('Los estudiantes no administran inscripciones');
    }
    if (curso.institucionId !== quien.institucionId) {
      throw new ForbiddenException('No tienes acceso a este curso');
    }
    if (quien.rol === Rol.DOCENTE && curso.docenteId !== quien.id) {
      throw new ForbiddenException('Solo el docente asignado administra este curso');
    }
    return curso;
  }

  private async rutaConAcceso(quien: UsuarioAutenticado, rutaId: string): Promise<Ruta> {
    const ruta = await this.rutasRepo.findOne({ where: { id: rutaId } });
    if (!ruta) throw new NotFoundException('Ruta no encontrada');
    if (quien.rol === Rol.SUPERADMIN) return ruta;
    if (quien.rol === Rol.ESTUDIANTE) {
      throw new ForbiddenException('Los estudiantes no administran inscripciones');
    }
    if (ruta.institucionId !== quien.institucionId) {
      throw new ForbiddenException('No tienes acceso a esta ruta');
    }
    return ruta;
  }

  private async verificarEstudiantesDeInstitucion(
    institucionId: string,
    estudianteIds: string[],
  ): Promise<void> {
    if (estudianteIds.length === 0) return;
    const encontrados = await this.usuariosRepo.findBy({ id: In(estudianteIds) });
    const todosValidos =
      encontrados.length === estudianteIds.length &&
      encontrados.every((u) => u.institucionId === institucionId && u.rol === Rol.ESTUDIANTE);
    if (!todosValidos) {
      throw new ForbiddenException('Todos los estudiantes deben ser de la misma institucion');
    }
  }
}
