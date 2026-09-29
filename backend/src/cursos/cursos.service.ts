import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Curso } from './curso.entidad';
import { ModuloCurso } from './modulo-curso.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { CrearCursoDto } from './dto/crear-curso.dto';
import { ActualizarCursoDto } from './dto/actualizar-curso.dto';
import { CrearModuloDto } from './dto/crear-modulo.dto';
import { ActualizarModuloDto } from './dto/actualizar-modulo.dto';

export type CursoListado = Curso & { totalEstudiantes: number; totalModulos: number };

@Injectable()
export class CursosService {
  constructor(
    @InjectRepository(Curso)
    private readonly cursosRepo: Repository<Curso>,
    @InjectRepository(ModuloCurso)
    private readonly modulosRepo: Repository<ModuloCurso>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepo: Repository<Inscripcion>,
  ) {}

  async listar(quien: UsuarioAutenticado): Promise<CursoListado[]> {
    const consulta = this.cursosRepo
      .createQueryBuilder('curso')
      .leftJoinAndSelect('curso.docente', 'docente')
      .leftJoinAndSelect('curso.modulos', 'modulo')
      .orderBy('curso.nombre', 'ASC');

    if (quien.rol === Rol.DOCENTE) {
      consulta.andWhere('curso.docenteId = :docenteId', { docenteId: quien.id });
    } else if (quien.rol === Rol.ADMIN_INSTITUCION) {
      consulta.andWhere('curso.institucionId = :institucionId', {
        institucionId: quien.institucionId,
      });
    } else if (quien.rol === Rol.ESTUDIANTE) {
      const cursoIds = await this.idsCursosDeEstudiante(quien.id);
      if (cursoIds.length === 0) return [];
      consulta.andWhere('curso.id IN (:...cursoIds)', { cursoIds });
    }

    const cursos = await consulta.getMany();
    return this.conTotales(cursos);
  }

  async explorar(quien: UsuarioAutenticado): Promise<CursoListado[]> {
    const cursoIds = await this.idsCursosDeEstudiante(quien.id);
    const consulta = this.cursosRepo
      .createQueryBuilder('curso')
      .leftJoinAndSelect('curso.docente', 'docente')
      .leftJoinAndSelect('curso.modulos', 'modulo')
      .where('curso.institucionId = :institucionId', {
        institucionId: quien.institucionId,
      })
      .orderBy('curso.nombre', 'ASC');
    if (cursoIds.length > 0) {
      consulta.andWhere('curso.id NOT IN (:...cursoIds)', { cursoIds });
    }
    const cursos = await consulta.getMany();
    return this.conTotales(cursos);
  }

  async obtener(quien: UsuarioAutenticado, id: string): Promise<CursoListado> {
    const curso = await this.cursosRepo.findOne({
      where: { id },
      relations: ['docente', 'modulos', 'modulos.configuracionJuego'],
      order: { modulos: { orden: 'ASC' } },
    });
    if (!curso) throw new NotFoundException('Curso no encontrado');
    await this.verificarAcceso(quien, curso);
    const [conTotal] = await this.conTotales([curso]);
    return conTotal;
  }

  async crear(quien: UsuarioAutenticado, datos: CrearCursoDto): Promise<Curso> {
    if (quien.rol === Rol.ESTUDIANTE) {
      throw new ForbiddenException('Los estudiantes no pueden crear cursos');
    }
    const institucionId =
      quien.rol === Rol.SUPERADMIN ? datos.institucionId : quien.institucionId;
    if (!institucionId) {
      throw new BadRequestException('Debes indicar la institucion del curso');
    }
    const docenteId = quien.rol === Rol.DOCENTE ? quien.id : datos.docenteId ?? null;

    const curso = this.cursosRepo.create({
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? '',
      institucionId,
      docenteId,
    });
    return this.cursosRepo.save(curso);
  }

  async actualizar(
    quien: UsuarioAutenticado,
    id: string,
    datos: ActualizarCursoDto,
  ): Promise<Curso> {
    const curso = await this.cursoOAcceso(quien, id, true);
    if (datos.nombre !== undefined) curso.nombre = datos.nombre;
    if (datos.descripcion !== undefined) curso.descripcion = datos.descripcion;
    if (datos.docenteId !== undefined && quien.rol !== Rol.DOCENTE) {
      curso.docenteId = datos.docenteId;
    }
    return this.cursosRepo.save(curso);
  }

  async eliminar(quien: UsuarioAutenticado, id: string): Promise<void> {
    const curso = await this.cursoOAcceso(quien, id, true);
    await this.cursosRepo.remove(curso);
  }

  async crearModulo(
    quien: UsuarioAutenticado,
    cursoId: string,
    datos: CrearModuloDto,
  ): Promise<ModuloCurso> {
    const curso = await this.cursoOAcceso(quien, cursoId, true);
    const total = await this.modulosRepo.count({ where: { cursoId: curso.id } });
    const modulo = this.modulosRepo.create({
      cursoId: curso.id,
      titulo: datos.titulo,
      descripcion: datos.descripcion ?? '',
      califica: datos.califica ?? true,
      orden: total + 1,
    });
    return this.modulosRepo.save(modulo);
  }

  async actualizarModulo(
    quien: UsuarioAutenticado,
    cursoId: string,
    moduloId: string,
    datos: ActualizarModuloDto,
  ): Promise<ModuloCurso> {
    await this.cursoOAcceso(quien, cursoId, true);
    const modulo = await this.moduloDelCurso(cursoId, moduloId);
    if (datos.titulo !== undefined) modulo.titulo = datos.titulo;
    if (datos.descripcion !== undefined) modulo.descripcion = datos.descripcion;
    if (datos.califica !== undefined) modulo.califica = datos.califica;
    return this.modulosRepo.save(modulo);
  }

  async eliminarModulo(
    quien: UsuarioAutenticado,
    cursoId: string,
    moduloId: string,
  ): Promise<void> {
    await this.cursoOAcceso(quien, cursoId, true);
    const modulo = await this.moduloDelCurso(cursoId, moduloId);
    await this.modulosRepo.remove(modulo);
  }

  async moverModulo(
    quien: UsuarioAutenticado,
    cursoId: string,
    moduloId: string,
    direccion: 'arriba' | 'abajo',
  ): Promise<void> {
    await this.cursoOAcceso(quien, cursoId, true);
    const modulos = await this.modulosRepo.find({
      where: { cursoId },
      order: { orden: 'ASC' },
    });
    const indice = modulos.findIndex((m) => m.id === moduloId);
    if (indice === -1) throw new NotFoundException('Modulo no encontrado');
    const destino = direccion === 'arriba' ? indice - 1 : indice + 1;
    if (destino < 0 || destino >= modulos.length) return;

    const ordenActual = modulos[indice].orden;
    modulos[indice].orden = modulos[destino].orden;
    modulos[destino].orden = ordenActual;
    await this.modulosRepo.save([modulos[indice], modulos[destino]]);
  }

  private async moduloDelCurso(cursoId: string, moduloId: string): Promise<ModuloCurso> {
    const modulo = await this.modulosRepo.findOne({ where: { id: moduloId, cursoId } });
    if (!modulo) throw new NotFoundException('Modulo no encontrado');
    return modulo;
  }

  /** Carga el curso y valida que quien escribe tenga permiso sobre el. */
  private async cursoOAcceso(
    quien: UsuarioAutenticado,
    id: string,
    requiereEscritura: boolean,
  ): Promise<Curso> {
    const curso = await this.cursosRepo.findOne({ where: { id } });
    if (!curso) throw new NotFoundException('Curso no encontrado');
    await this.verificarAcceso(quien, curso, requiereEscritura);
    return curso;
  }

  private async verificarAcceso(
    quien: UsuarioAutenticado,
    curso: Curso,
    requiereEscritura = false,
  ): Promise<void> {
    if (quien.rol === Rol.SUPERADMIN) return;
    if (quien.rol === Rol.ADMIN_INSTITUCION) {
      if (curso.institucionId !== quien.institucionId) {
        throw new ForbiddenException('No tienes acceso a este curso');
      }
      return;
    }
    if (quien.rol === Rol.DOCENTE) {
      if (requiereEscritura && curso.docenteId !== quien.id) {
        throw new ForbiddenException('Solo el docente asignado puede modificar este curso');
      }
      if (curso.institucionId !== quien.institucionId) {
        throw new ForbiddenException('No tienes acceso a este curso');
      }
      return;
    }
    // estudiante: solo lectura de cursos donde esta inscrito
    if (requiereEscritura) {
      throw new ForbiddenException('Los estudiantes no pueden modificar cursos');
    }
    const inscrito = await this.inscripcionesRepo.findOne({
      where: { estudianteId: quien.id, cursoId: curso.id },
    });
    if (!inscrito) throw new ForbiddenException('No estas inscrito en este curso');
  }

  private async idsCursosDeEstudiante(estudianteId: string): Promise<string[]> {
    const inscripciones = await this.inscripcionesRepo.find({
      where: { estudianteId, cursoId: Not(IsNull()) },
    });
    return inscripciones.map((i) => i.cursoId as string);
  }

  private async conTotales(cursos: Curso[]): Promise<CursoListado[]> {
    if (cursos.length === 0) return [];
    const conteos = await this.inscripcionesRepo
      .createQueryBuilder('inscripcion')
      .select('inscripcion.cursoId', 'cursoId')
      .addSelect('COUNT(*)', 'total')
      .where('inscripcion.cursoId IN (:...ids)', { ids: cursos.map((c) => c.id) })
      .groupBy('inscripcion.cursoId')
      .getRawMany<{ cursoId: string; total: string }>();
    const mapaConteos = new Map(conteos.map((c) => [c.cursoId, Number(c.total)]));

    return cursos.map((curso) =>
      Object.assign(curso, {
        totalEstudiantes: mapaConteos.get(curso.id) ?? 0,
        totalModulos: curso.modulos?.length ?? 0,
      }),
    );
  }
}
