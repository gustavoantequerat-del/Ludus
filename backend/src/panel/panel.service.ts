import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institucion } from '../instituciones/institucion.entidad';
import { Usuario } from '../usuarios/usuario.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Ruta } from '../rutas/ruta.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Solicitud, EstadoSolicitud } from '../solicitudes/solicitud.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { Resultado } from '../resultados/resultado.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';

@Injectable()
export class PanelService {
  constructor(
    @InjectRepository(Institucion)
    private readonly institucionesRepo: Repository<Institucion>,
    @InjectRepository(Usuario)
    private readonly usuariosRepo: Repository<Usuario>,
    @InjectRepository(Curso)
    private readonly cursosRepo: Repository<Curso>,
    @InjectRepository(Ruta)
    private readonly rutasRepo: Repository<Ruta>,
    @InjectRepository(ModuloCurso)
    private readonly modulosRepo: Repository<ModuloCurso>,
    @InjectRepository(Solicitud)
    private readonly solicitudesRepo: Repository<Solicitud>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepo: Repository<Inscripcion>,
    @InjectRepository(Resultado)
    private readonly resultadosRepo: Repository<Resultado>,
  ) {}

  /**
   * Actividad reciente del sistema. Se arma combinando las tablas existentes
   * (no hay una bitacora de auditoria dedicada, para mantener el alcance
   * simple); solo la usa el superadministrador.
   */
  async actividadReciente(limite = 20) {
    const [cursos, solicitudes, resultados, usuarios] = await Promise.all([
      this.cursosRepo.find({ order: { creadoEn: 'DESC' }, take: 10, relations: ['institucion'] }),
      this.solicitudesRepo.find({
        order: { creadoEn: 'DESC' },
        take: 10,
        relations: ['estudiante', 'estudiante.institucion', 'curso', 'ruta'],
      }),
      this.resultadosRepo.find({
        order: { creadoEn: 'DESC' },
        take: 10,
        relations: ['estudiante', 'estudiante.institucion', 'modulo'],
      }),
      this.usuariosRepo.find({ order: { creadoEn: 'DESC' }, take: 10, relations: ['institucion'] }),
    ]);

    const eventos = [
      ...cursos.map((c) => ({
        texto: `Se creo el curso ${c.nombre}`,
        institucion: c.institucion?.nombre ?? '',
        cuando: c.creadoEn,
      })),
      ...solicitudes.map((s) => ({
        texto: `${s.estudiante.nombre} ${s.tipo === 'ingreso' ? 'solicito inscripcion a' : 'solicito salir de'} ${s.curso?.nombre ?? s.ruta?.nombre ?? ''}`,
        institucion: s.estudiante.institucion?.nombre ?? '',
        cuando: s.creadoEn,
      })),
      ...resultados.map((r) => ({
        texto: `${r.estudiante.nombre} completo ${r.modulo.titulo} con ${r.puntaje} puntos`,
        institucion: r.estudiante.institucion?.nombre ?? '',
        cuando: r.creadoEn,
      })),
      ...usuarios.map((u) => ({
        texto: `Se dio de alta a ${u.nombre} (${u.rol})`,
        institucion: u.institucion?.nombre ?? 'Global',
        cuando: u.creadoEn,
      })),
    ];

    return eventos
      .sort((a, b) => b.cuando.getTime() - a.cuando.getTime())
      .slice(0, limite);
  }

  async resumen(quien: UsuarioAutenticado) {
    if (quien.rol === Rol.SUPERADMIN) return this.resumenSuperadmin();
    if (quien.rol === Rol.ADMIN_INSTITUCION) {
      return this.resumenAdminInstitucion(quien.institucionId as string);
    }
    if (quien.rol === Rol.DOCENTE) {
      return this.resumenDocente(quien.id, quien.institucionId as string);
    }
    return this.resumenEstudiante(quien.id);
  }

  private async resumenSuperadmin() {
    const [totalInstituciones, totalUsuarios, totalDocentes, totalEstudiantes, totalCursos, totalRutas] =
      await Promise.all([
        this.institucionesRepo.count(),
        this.usuariosRepo.count(),
        this.usuariosRepo.count({ where: { rol: Rol.DOCENTE } }),
        this.usuariosRepo.count({ where: { rol: Rol.ESTUDIANTE } }),
        this.cursosRepo.count(),
        this.rutasRepo.count(),
      ]);
    return { totalInstituciones, totalUsuarios, totalDocentes, totalEstudiantes, totalCursos, totalRutas };
  }

  private async resumenAdminInstitucion(institucionId: string) {
    const [totalDocentes, totalEstudiantes, totalCursos, totalRutas, solicitudesPendientes] =
      await Promise.all([
        this.usuariosRepo.count({ where: { institucionId, rol: Rol.DOCENTE } }),
        this.usuariosRepo.count({ where: { institucionId, rol: Rol.ESTUDIANTE } }),
        this.cursosRepo.count({ where: { institucionId } }),
        this.rutasRepo.count({ where: { institucionId } }),
        this.solicitudesRepo
          .createQueryBuilder('solicitud')
          .leftJoin('solicitud.estudiante', 'estudiante')
          .where('estudiante.institucionId = :institucionId', { institucionId })
          .andWhere('solicitud.estado = :estado', { estado: EstadoSolicitud.PENDIENTE })
          .getCount(),
      ]);
    return { totalDocentes, totalEstudiantes, totalCursos, totalRutas, solicitudesPendientes };
  }

  private async resumenDocente(docenteId: string, institucionId: string) {
    const misCursos = await this.cursosRepo.find({ where: { docenteId } });
    const cursoIds = misCursos.map((c) => c.id);
    const [misRutas, totalEstudiantes, juegosConfigurados] = await Promise.all([
      this.rutasRepo.count({ where: { institucionId } }),
      cursoIds.length
        ? this.inscripcionesRepo
            .createQueryBuilder('inscripcion')
            .where('inscripcion.cursoId IN (:...ids)', { ids: cursoIds })
            .getCount()
        : 0,
      cursoIds.length
        ? this.modulosRepo
            .createQueryBuilder('modulo')
            .leftJoin('modulo.configuracionJuego', 'configuracion')
            .where('modulo.cursoId IN (:...ids)', { ids: cursoIds })
            .andWhere('configuracion.id IS NOT NULL')
            .getCount()
        : 0,
    ]);
    return { misCursos: misCursos.length, misRutas, totalEstudiantes, juegosConfigurados };
  }

  private async resumenEstudiante(estudianteId: string) {
    const [misCursos, misRutas] = await Promise.all([
      this.inscripcionesRepo
        .createQueryBuilder('i')
        .where('i.estudianteId = :estudianteId', { estudianteId })
        .andWhere('i.cursoId IS NOT NULL')
        .getCount(),
      this.inscripcionesRepo
        .createQueryBuilder('i')
        .where('i.estudianteId = :estudianteId', { estudianteId })
        .andWhere('i.rutaId IS NOT NULL')
        .getCount(),
    ]);
    return { misCursos, misRutas };
  }
}
