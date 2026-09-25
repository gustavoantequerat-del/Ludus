import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CasoCumplimiento } from './caso-cumplimiento.entidad';
import { Personaje } from './personajes/personaje.entidad';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { CrearCasoDto } from './dto/crear-caso.dto';
import { ActualizarCasoDto } from './dto/actualizar-caso.dto';

/**
 * Casos que administra el docente.
 *
 * Los del catalogo base (institucion_id en null) se ven siempre, pero solo el
 * superadmin los edita: para el docente son plantillas que puede duplicar a su
 * institucion y recien ahi cambiar.
 */
@Injectable()
export class CasosService {
  constructor(
    @InjectRepository(CasoCumplimiento)
    private readonly casosRepo: Repository<CasoCumplimiento>,
    @InjectRepository(Personaje)
    private readonly personajesRepo: Repository<Personaje>,
  ) {}

  async listar(quien: UsuarioAutenticado): Promise<CasoCumplimiento[]> {
    const consulta = this.casosRepo
      .createQueryBuilder('caso')
      .leftJoinAndSelect('caso.personaje', 'personaje')
      .orderBy('caso.institucionId', 'ASC', 'NULLS LAST')
      .addOrderBy('caso.entidad', 'ASC');

    if (quien.rol !== Rol.SUPERADMIN) {
      consulta.where('caso.institucionId = :institucionId OR caso.institucionId IS NULL', {
        institucionId: quien.institucionId,
      });
    }
    return consulta.getMany();
  }

  async crear(quien: UsuarioAutenticado, datos: CrearCasoDto): Promise<CasoCumplimiento> {
    const caso = this.casosRepo.create({
      ...this.camposEditables(datos),
      entidad: datos.entidad,
      decisionCorrecta: datos.decisionCorrecta,
      personajeId: await this.personajeValido(quien, datos.personajeId ?? null),
      institucionId: quien.rol === Rol.SUPERADMIN ? null : quien.institucionId,
    });
    return this.casosRepo.save(caso);
  }

  async actualizar(
    quien: UsuarioAutenticado,
    id: string,
    datos: ActualizarCasoDto,
  ): Promise<CasoCumplimiento> {
    const caso = await this.conAcceso(quien, id);
    Object.assign(caso, this.camposEditables(datos));
    if (datos.entidad !== undefined) caso.entidad = datos.entidad;
    if (datos.decisionCorrecta !== undefined) caso.decisionCorrecta = datos.decisionCorrecta;
    if (datos.personajeId !== undefined) {
      caso.personajeId = await this.personajeValido(quien, datos.personajeId);
    }
    return this.casosRepo.save(caso);
  }

  async eliminar(quien: UsuarioAutenticado, id: string): Promise<void> {
    const caso = await this.conAcceso(quien, id);
    await this.casosRepo.remove(caso);
  }

  /**
   * Copia el catalogo base a la institucion del docente para que pueda
   * editarlo. A partir de la primera copia, la mesa juega con los casos de la
   * institucion y deja de usar el catalogo base.
   */
  async duplicarBase(quien: UsuarioAutenticado): Promise<CasoCumplimiento[]> {
    if (!quien.institucionId) {
      throw new BadRequestException('Tu usuario no pertenece a una institucion');
    }

    const base = await this.casosRepo.find({ where: { institucionId: IsNull() } });
    const existentes = await this.casosRepo.find({
      where: { institucionId: quien.institucionId },
      select: { entidad: true },
    });
    const yaCopiadas = new Set(existentes.map((caso) => caso.entidad));

    const copias = base
      .filter((caso) => !yaCopiadas.has(caso.entidad))
      .map((caso) => {
        const { id, creadoEn, actualizadoEn, personaje, institucion, ...resto } = caso;
        return this.casosRepo.create({ ...resto, institucionId: quien.institucionId });
      });

    return this.casosRepo.save(copias);
  }

  /* ---------------------------------------------------------------- */

  /** Lo que el docente puede cambiar de un caso, sin tocar su alcance. */
  private camposEditables(datos: ActualizarCasoDto) {
    const campos = {
      tipo: datos.tipo,
      jurisdiccion: datos.jurisdiccion,
      solicitud: datos.solicitud,
      registroLicencia: datos.registroLicencia,
      travelRule: datos.travelRule,
      beneficiarioFinal: datos.beneficiarioFinal,
      controlesAml: datos.controlesAml,
      sanciones: datos.sanciones,
      exposicionOnchain: datos.exposicionOnchain,
      camposExtra: datos.camposExtra,
      regla: datos.regla,
      explicacion: datos.explicacion,
      origen: datos.origen,
      activo: datos.activo,
    };
    // Un campo que no vino en el cuerpo no se toca; uno que vino vacio si.
    return Object.fromEntries(
      Object.entries(campos).filter(([, valor]) => valor !== undefined),
    );
  }

  private async personajeValido(
    quien: UsuarioAutenticado,
    personajeId: string | null,
  ): Promise<string | null> {
    if (!personajeId) return null;

    const personaje = await this.personajesRepo.findOne({ where: { id: personajeId } });
    if (!personaje) throw new NotFoundException('El personaje no existe');
    if (
      quien.rol !== Rol.SUPERADMIN &&
      personaje.institucionId !== null &&
      personaje.institucionId !== quien.institucionId
    ) {
      throw new ForbiddenException('Ese personaje es de otra institucion');
    }
    return personaje.id;
  }

  private async conAcceso(quien: UsuarioAutenticado, id: string): Promise<CasoCumplimiento> {
    const caso = await this.casosRepo.findOne({ where: { id } });
    if (!caso) throw new NotFoundException('El caso no existe');
    if (quien.rol === Rol.SUPERADMIN) return caso;

    if (caso.institucionId === null) {
      throw new ForbiddenException(
        'El catalogo base no se edita: duplicalo a tu institucion y cambia la copia',
      );
    }
    if (caso.institucionId !== quien.institucionId) {
      throw new ForbiddenException('No tienes acceso a este caso');
    }
    return caso;
  }
}
