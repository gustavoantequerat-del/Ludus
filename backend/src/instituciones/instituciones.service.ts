import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institucion } from './institucion.entidad';
import { Usuario } from '../usuarios/usuario.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { CrearInstitucionDto } from './dto/crear-institucion.dto';
import { ActualizarInstitucionDto } from './dto/actualizar-institucion.dto';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { generarCodigo, mostrarCodigo, normalizarCodigo } from './codigo-registro';

export type InstitucionListada = Institucion & {
  totalDocentes: number;
  totalEstudiantes: number;
  totalCursos: number;
};

@Injectable()
export class InstitucionesService {
  constructor(
    @InjectRepository(Institucion)
    private readonly institucionesRepo: Repository<Institucion>,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(Curso)
    private readonly cursosRepo: Repository<Curso>,
  ) {}

  async listar(): Promise<InstitucionListada[]> {
    const instituciones = await this.institucionesRepo.find({ order: { nombre: 'ASC' } });
    if (instituciones.length === 0) return [];
    const ids = instituciones.map((i) => i.id);

    const [docentes, estudiantes, cursos] = await Promise.all([
      this.contarPorInstitucion(ids, Rol.DOCENTE),
      this.contarPorInstitucion(ids, Rol.ESTUDIANTE),
      this.cursosRepo
        .createQueryBuilder('curso')
        .select('curso.institucionId', 'institucionId')
        .addSelect('COUNT(*)', 'total')
        .where('curso.institucionId IN (:...ids)', { ids })
        .groupBy('curso.institucionId')
        .getRawMany<{ institucionId: string; total: string }>()
        .then((filas) => new Map(filas.map((f) => [f.institucionId, Number(f.total)]))),
    ]);

    return instituciones.map((institucion) =>
      Object.assign(institucion, {
        totalDocentes: docentes.get(institucion.id) ?? 0,
        totalEstudiantes: estudiantes.get(institucion.id) ?? 0,
        totalCursos: cursos.get(institucion.id) ?? 0,
      }),
    );
  }

  private async contarPorInstitucion(ids: string[], rol: Rol): Promise<Map<string, number>> {
    const filas = await this.usuariosRepo
      .createQueryBuilder('usuario')
      .select('usuario.institucionId', 'institucionId')
      .addSelect('COUNT(*)', 'total')
      .where('usuario.institucionId IN (:...ids)', { ids })
      .andWhere('usuario.rol = :rol', { rol })
      .groupBy('usuario.institucionId')
      .getRawMany<{ institucionId: string; total: string }>();
    return new Map(filas.map((f) => [f.institucionId, Number(f.total)]));
  }

  async obtener(id: string): Promise<Institucion> {
    const institucion = await this.institucionesRepo.findOne({ where: { id } });
    if (!institucion) throw new NotFoundException('Institucion no encontrada');
    return institucion;
  }

  async crear(datos: CrearInstitucionDto): Promise<Institucion> {
    await this.verificarDominioLibre(datos.dominio);
    const institucion = this.institucionesRepo.create(datos);
    return this.institucionesRepo.save(institucion);
  }

  /** El dominio es unico: avisa cual institucion ya lo tiene en vez de un error generico. */
  private async verificarDominioLibre(dominio: string | undefined, salvoId?: string): Promise<void> {
    if (!dominio) return;
    const otra = await this.institucionesRepo
      .createQueryBuilder('institucion')
      .where('LOWER(institucion.dominio) = LOWER(:dominio)', { dominio })
      .getOne();
    if (otra && otra.id !== salvoId) {
      throw new ConflictException(`El dominio ${dominio} ya es de la institucion ${otra.nombre}`);
    }
  }

  async actualizar(
    id: string,
    datos: ActualizarInstitucionDto,
  ): Promise<Institucion> {
    const institucion = await this.obtener(id);
    await this.verificarDominioLibre(datos.dominio, id);
    Object.assign(institucion, datos);
    return this.institucionesRepo.save(institucion);
  }

  async eliminar(id: string): Promise<void> {
    const institucion = await this.obtener(id);
    await this.institucionesRepo.remove(institucion);
  }

  /* ---------------- Codigo de registro de estudiantes ---------------- */

  /** El superadmin ve el de cualquiera; el admin de institucion, solo el de la suya. */
  async codigoRegistro(quien: UsuarioAutenticado, id: string) {
    this.verificarAdminDe(quien, id);
    const institucion = await this.institucionesRepo
      .createQueryBuilder('institucion')
      .addSelect('institucion.codigoRegistro')
      .where('institucion.id = :id', { id })
      .getOne();
    if (!institucion) throw new NotFoundException('Institucion no encontrada');
    return { institucionId: institucion.id, nombre: institucion.nombre, codigo: mostrarCodigo(institucion.codigoRegistro) };
  }

  /** Codigo nuevo: el anterior deja de servir (por ejemplo, si se filtro). */
  async renovarCodigo(quien: UsuarioAutenticado, id: string) {
    this.verificarAdminDe(quien, id);
    await this.obtener(id);
    await this.institucionesRepo.update(id, { codigoRegistro: generarCodigo() });
    return this.codigoRegistro(quien, id);
  }

  /** La institucion activa de un codigo, o null. */
  async porCodigo(texto: string): Promise<Institucion | null> {
    const codigo = normalizarCodigo(texto);
    if (!codigo) return null;
    return this.institucionesRepo.findOne({ where: { codigoRegistro: codigo, activa: true } });
  }

  private verificarAdminDe(quien: UsuarioAutenticado, id: string) {
    if (quien.rol === Rol.SUPERADMIN) return;
    if (quien.rol === Rol.ADMIN_INSTITUCION && quien.institucionId === id) return;
    throw new ForbiddenException('Solo el admin de la institucion ve su codigo de registro');
  }
}
