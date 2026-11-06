import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoSolicitud, Solicitud, TipoSolicitud } from './solicitud.entidad';
import { Curso } from '../cursos/curso.entidad';
import { Ruta } from '../rutas/ruta.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud)
    private readonly solicitudesRepo: Repository<Solicitud>,
    @InjectRepository(Curso)
    private readonly cursosRepo: Repository<Curso>,
    @InjectRepository(Ruta)
    private readonly rutasRepo: Repository<Ruta>,
    @InjectRepository(Inscripcion)
    private readonly inscripcionesRepo: Repository<Inscripcion>,
  ) {}

  async listar(quien: UsuarioAutenticado): Promise<Solicitud[]> {
    const consulta = this.solicitudesRepo
      .createQueryBuilder('solicitud')
      .leftJoinAndSelect('solicitud.estudiante', 'estudiante')
      .leftJoinAndSelect('solicitud.curso', 'curso')
      .leftJoinAndSelect('solicitud.ruta', 'ruta')
      .orderBy('solicitud.creadoEn', 'DESC');

    if (quien.rol === Rol.ESTUDIANTE) {
      consulta.andWhere('solicitud.estudianteId = :id', { id: quien.id });
    } else if (quien.rol === Rol.ADMIN_INSTITUCION) {
      consulta.andWhere('estudiante.institucionId = :institucionId', {
        institucionId: quien.institucionId,
      });
    } else if (quien.rol === Rol.DOCENTE) {
      throw new ForbiddenException('Los docentes no gestionan solicitudes');
    }
    return consulta.getMany();
  }

  async crear(quien: UsuarioAutenticado, datos: CrearSolicitudDto): Promise<Solicitud> {
    if (quien.rol !== Rol.ESTUDIANTE) {
      throw new ForbiddenException('Solo un estudiante puede enviar solicitudes');
    }
    if (datos.cursoId && datos.rutaId) {
      throw new BadRequestException('Elige un curso o una ruta, no los dos');
    }
    const institucionObjetivo = await this.institucionDelObjetivo(datos);
    if (institucionObjetivo !== quien.institucionId) {
      throw new ForbiddenException('El curso o ruta no pertenece a tu institucion');
    }

    const yaInscrito = await this.inscripcionesRepo.findOne({
      where: { estudianteId: quien.id, cursoId: datos.cursoId ?? undefined, rutaId: datos.rutaId ?? undefined },
    });
    if (datos.tipo === TipoSolicitud.INGRESO && yaInscrito) {
      throw new BadRequestException('Ya estas inscrito en ese curso o ruta');
    }
    if (datos.tipo === TipoSolicitud.SALIDA && !yaInscrito) {
      throw new BadRequestException('No estas inscrito en ese curso o ruta');
    }

    const repetida = await this.solicitudesRepo.exist({
      where: {
        estudianteId: quien.id,
        tipo: datos.tipo,
        estado: EstadoSolicitud.PENDIENTE,
        ...(datos.cursoId ? { cursoId: datos.cursoId } : { rutaId: datos.rutaId }),
      },
    });
    if (repetida) {
      throw new BadRequestException('Ya tienes una solicitud pendiente para eso: espera a que la resuelvan');
    }
    const solicitud = this.solicitudesRepo.create({
      estudianteId: quien.id,
      tipo: datos.tipo,
      cursoId: datos.cursoId ?? null,
      rutaId: datos.rutaId ?? null,
    });
    return this.solicitudesRepo.save(solicitud);
  }

  async resolver(
    quien: UsuarioAutenticado,
    id: string,
    estado: 'aprobada' | 'rechazada',
  ): Promise<Solicitud> {
    if (quien.rol !== Rol.SUPERADMIN && quien.rol !== Rol.ADMIN_INSTITUCION) {
      throw new ForbiddenException('No tienes permiso para resolver solicitudes');
    }
    const solicitud = await this.solicitudesRepo.findOne({
      where: { id },
      relations: ['estudiante'],
    });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    if (
      quien.rol === Rol.ADMIN_INSTITUCION &&
      solicitud.estudiante.institucionId !== quien.institucionId
    ) {
      throw new ForbiddenException('No tienes acceso a esta solicitud');
    }
    if (solicitud.estado !== EstadoSolicitud.PENDIENTE) {
      throw new BadRequestException('La solicitud ya fue resuelta');
    }

    const nuevo = estado === 'aprobada' ? EstadoSolicitud.APROBADA : EstadoSolicitud.RECHAZADA;
    // Solo cambia si sigue pendiente: si dos admins la resuelven a la vez, gana uno.
    const cambio = await this.solicitudesRepo
      .createQueryBuilder()
      .update(Solicitud)
      .set({ estado: nuevo })
      .where('id = :id AND estado = :pendiente', { id, pendiente: EstadoSolicitud.PENDIENTE })
      .execute();
    if (!cambio.affected) throw new BadRequestException('La solicitud ya fue resuelta');
    solicitud.estado = nuevo;

    if (estado === 'aprobada') {
      await this.aplicarSolicitud(solicitud);
    }
    return solicitud;
  }

  private async aplicarSolicitud(solicitud: Solicitud): Promise<void> {
    if (solicitud.tipo === TipoSolicitud.INGRESO) {
      // Si ya estaba inscrito (lo asigno un docente mientras tanto), no se duplica.
      await this.inscripcionesRepo
        .createQueryBuilder()
        .insert()
        .into(Inscripcion)
        .values({ estudianteId: solicitud.estudianteId, cursoId: solicitud.cursoId, rutaId: solicitud.rutaId })
        .orIgnore()
        .execute();
    } else {
      // Solo filtra por lo que trae la solicitud: un undefined en el criterio
      // de delete() hace que TypeORM no encuentre la inscripcion.
      await this.inscripcionesRepo.delete({
        estudianteId: solicitud.estudianteId,
        ...(solicitud.cursoId ? { cursoId: solicitud.cursoId } : {}),
        ...(solicitud.rutaId ? { rutaId: solicitud.rutaId } : {}),
      });
    }
  }

  private async institucionDelObjetivo(datos: CrearSolicitudDto): Promise<string> {
    if (datos.cursoId) {
      const curso = await this.cursosRepo.findOne({ where: { id: datos.cursoId } });
      if (!curso) throw new NotFoundException('Curso no encontrado');
      return curso.institucionId;
    }
    if (datos.rutaId) {
      const ruta = await this.rutasRepo.findOne({ where: { id: datos.rutaId } });
      if (!ruta) throw new NotFoundException('Ruta no encontrada');
      return ruta.institucionId;
    }
    throw new BadRequestException('Debes indicar un curso o una ruta');
  }
}
