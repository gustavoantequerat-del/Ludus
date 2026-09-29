import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Ruta } from './ruta.entidad';
import { RutaCurso } from './ruta-curso.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { CrearRutaDto } from './dto/crear-ruta.dto';
import { ActualizarRutaDto } from './dto/actualizar-ruta.dto';

export type RutaListada = Ruta & { totalEstudiantes: number };

@Injectable()
export class RutasService {
  constructor(
    @InjectRepository(Ruta)
    private readonly rutasRepo: Repository<Ruta>,
    @InjectRepository(RutaCurso)
    private readonly rutasCursosRepo: Repository<RutaCurso>,
    @InjectRepository(Curso)
    private readonly cursosRepo: Repository<Curso>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepo: Repository<Inscripcion>,
  ) {}

  async listar(quien: UsuarioAutenticado): Promise<RutaListada[]> {
    const consulta = this.rutasRepo
      .createQueryBuilder('ruta')
      .leftJoinAndSelect('ruta.cursos', 'rutaCurso')
      .leftJoinAndSelect('rutaCurso.curso', 'curso')
      .orderBy('ruta.nombre', 'ASC')
      .addOrderBy('rutaCurso.orden', 'ASC');

    if (quien.rol === Rol.ESTUDIANTE) {
      const rutaIds = await this.idsRutasDeEstudiante(quien.id);
      if (rutaIds.length === 0) return [];
      consulta.andWhere('ruta.id IN (:...rutaIds)', { rutaIds });
    } else if (quien.rol !== Rol.SUPERADMIN) {
      consulta.andWhere('ruta.institucionId = :institucionId', {
        institucionId: quien.institucionId,
      });
    }

    const rutas = await consulta.getMany();
    return this.conTotales(rutas);
  }

  async obtener(quien: UsuarioAutenticado, id: string): Promise<RutaListada> {
    const ruta = await this.rutasRepo.findOne({
      where: { id },
      relations: ['cursos', 'cursos.curso'],
      order: { cursos: { orden: 'ASC' } },
    });
    if (!ruta) throw new NotFoundException('Ruta no encontrada');
    await this.verificarAcceso(quien, ruta);
    const [conTotal] = await this.conTotales([ruta]);
    return conTotal;
  }

  async crear(quien: UsuarioAutenticado, datos: CrearRutaDto): Promise<Ruta> {
    if (quien.rol === Rol.ESTUDIANTE) {
      throw new ForbiddenException('Los estudiantes no pueden crear rutas');
    }
    const institucionId =
      quien.rol === Rol.SUPERADMIN ? datos.institucionId : quien.institucionId;
    if (!institucionId) {
      throw new BadRequestException('Debes indicar la institucion de la ruta');
    }
    const ruta = this.rutasRepo.create({
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? '',
      institucionId,
    });
    return this.rutasRepo.save(ruta);
  }

  async actualizar(
    quien: UsuarioAutenticado,
    id: string,
    datos: ActualizarRutaDto,
  ): Promise<Ruta> {
    const ruta = await this.rutaOAcceso(quien, id);
    if (datos.nombre !== undefined) ruta.nombre = datos.nombre;
    if (datos.descripcion !== undefined) ruta.descripcion = datos.descripcion;
    return this.rutasRepo.save(ruta);
  }

  async eliminar(quien: UsuarioAutenticado, id: string): Promise<void> {
    const ruta = await this.rutaOAcceso(quien, id);
    await this.rutasRepo.remove(ruta);
  }

  async agregarCurso(
    quien: UsuarioAutenticado,
    rutaId: string,
    cursoId: string,
  ): Promise<RutaCurso> {
    const ruta = await this.rutaOAcceso(quien, rutaId);
    const curso = await this.cursosRepo.findOne({ where: { id: cursoId } });
    if (!curso) throw new NotFoundException('Curso no encontrado');
    if (curso.institucionId !== ruta.institucionId) {
      throw new BadRequestException('El curso debe ser de la misma institucion que la ruta');
    }
    const total = await this.rutasCursosRepo.count({ where: { rutaId } });
    const rutaCurso = this.rutasCursosRepo.create({ rutaId, cursoId, orden: total + 1 });
    return this.rutasCursosRepo.save(rutaCurso);
  }

  async quitarCurso(
    quien: UsuarioAutenticado,
    rutaId: string,
    cursoId: string,
  ): Promise<void> {
    await this.rutaOAcceso(quien, rutaId);
    const rutaCurso = await this.rutasCursosRepo.findOne({ where: { rutaId, cursoId } });
    if (!rutaCurso) throw new NotFoundException('El curso no pertenece a esta ruta');
    await this.rutasCursosRepo.remove(rutaCurso);
  }

  private async rutaOAcceso(quien: UsuarioAutenticado, id: string): Promise<Ruta> {
    const ruta = await this.rutasRepo.findOne({ where: { id } });
    if (!ruta) throw new NotFoundException('Ruta no encontrada');
    await this.verificarAcceso(quien, ruta, true);
    return ruta;
  }

  private async verificarAcceso(
    quien: UsuarioAutenticado,
    ruta: Ruta,
    requiereEscritura = false,
  ): Promise<void> {
    if (quien.rol === Rol.SUPERADMIN) return;
    if (quien.rol === Rol.ADMIN_INSTITUCION || quien.rol === Rol.DOCENTE) {
      if (ruta.institucionId !== quien.institucionId) {
        throw new ForbiddenException('No tienes acceso a esta ruta');
      }
      return;
    }
    if (requiereEscritura) {
      throw new ForbiddenException('Los estudiantes no pueden modificar rutas');
    }
    const inscrito = await this.inscripcionesRepo.findOne({
      where: { estudianteId: quien.id, rutaId: ruta.id },
    });
    if (!inscrito) throw new ForbiddenException('No estas inscrito en esta ruta');
  }

  private async idsRutasDeEstudiante(estudianteId: string): Promise<string[]> {
    const inscripciones = await this.inscripcionesRepo.find({
      where: { estudianteId, rutaId: Not(IsNull()) },
    });
    return inscripciones.map((i) => i.rutaId as string);
  }

  private async conTotales(rutas: Ruta[]): Promise<RutaListada[]> {
    if (rutas.length === 0) return [];
    const conteos = await this.inscripcionesRepo
      .createQueryBuilder('inscripcion')
      .select('inscripcion.rutaId', 'rutaId')
      .addSelect('COUNT(*)', 'total')
      .where('inscripcion.rutaId IN (:...ids)', { ids: rutas.map((r) => r.id) })
      .groupBy('inscripcion.rutaId')
      .getRawMany<{ rutaId: string; total: string }>();
    const mapaConteos = new Map(conteos.map((c) => [c.rutaId, Number(c.total)]));
    return rutas.map((ruta) =>
      Object.assign(ruta, { totalEstudiantes: mapaConteos.get(ruta.id) ?? 0 }),
    );
  }
}
