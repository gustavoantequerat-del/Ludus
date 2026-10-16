import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Acceso } from './acceso.entidad';
import { OrigenAcceso } from './origen-acceso';
import { FiltroAccesosDto } from './dto/filtro-accesos.dto';
import { Rol } from '../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../comun/tipos/usuario-autenticado';

/** Tope de filas que devuelve el listado: es para mirar, no para exportar. */
const MAXIMO_LISTADO = 500;
const DIAS_POR_DEFECTO = 30;

@Injectable()
export class AccesosService {
  private readonly bitacora = new Logger(AccesosService.name);

  constructor(@InjectRepository(Acceso) private readonly accesosRepo: Repository<Acceso>) {}

  /** Nunca hace fallar el login: si no se pudo guardar, solo queda en el log. */
  async registrar(usuarioId: string, origen: OrigenAcceso): Promise<void> {
    try {
      await this.accesosRepo.insert({ usuarioId, ...origen });
    } catch (error) {
      this.bitacora.warn(`No se pudo registrar el acceso de ${usuarioId}: ${(error as Error).message}`);
    }
  }

  /**
   * Accesos de los ultimos dias con un resumen. El superadmin ve todos; un
   * admin de institucion, solo los de su institucion.
   */
  async listar(quien: UsuarioAutenticado, filtro: FiltroAccesosDto) {
    const dias = filtro.dias ?? DIAS_POR_DEFECTO;
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    // "Ultimas 24 h" y no "hoy": el servidor corre en UTC y los usuarios no.
    const haceUnDia = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const base = (conDatos = false) => {
      const consulta = this.accesosRepo.createQueryBuilder('acceso');
      if (conDatos) {
        consulta
          .innerJoinAndSelect('acceso.usuario', 'usuario')
          .leftJoinAndSelect('usuario.institucion', 'institucion');
      } else {
        consulta.innerJoin('acceso.usuario', 'usuario');
      }
      consulta.where('acceso.creadoEn >= :desde', { desde });
      if (quien.rol !== Rol.SUPERADMIN) {
        consulta.andWhere('usuario.institucionId = :institucionId', { institucionId: quien.institucionId });
      }
      if (filtro.usuarioId) consulta.andWhere('acceso.usuarioId = :usuarioId', { usuarioId: filtro.usuarioId });
      return consulta;
    };

    const [accesos, total, usuariosDistintos, ultimas24h] = await Promise.all([
      base(true)
        .orderBy('acceso.creadoEn', 'DESC')
        .take(MAXIMO_LISTADO)
        .getMany(),
      base().getCount(),
      base()
        .select('COUNT(DISTINCT acceso.usuarioId)', 'cantidad')
        .getRawOne<{ cantidad: string }>(),
      base().andWhere('acceso.creadoEn >= :haceUnDia', { haceUnDia }).getCount(),
    ]);

    return {
      dias,
      resumen: { total, usuariosDistintos: Number(usuariosDistintos?.cantidad ?? 0), ultimas24h },
      accesos: accesos.map((a) => ({
        id: a.id,
        metodo: a.metodo,
        ip: a.ip,
        agente: a.agente,
        creadoEn: a.creadoEn,
        usuario: {
          id: a.usuario.id,
          nombre: a.usuario.nombre,
          correo: a.usuario.correo,
          rol: a.usuario.rol,
          institucion: a.usuario.institucion?.nombre ?? null,
        },
      })),
    };
  }
}
