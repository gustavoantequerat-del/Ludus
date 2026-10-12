import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Mazo } from './mazo.entidad';
import { ConfiguracionJuego } from '../configuracion-juego.entidad';
import { ArchivosService } from '../../archivos/archivos.service';
import {
  CARPETA_FICHAS,
  CARPETA_FONDOS,
  PATRON_ARCHIVO_SUBIDO,
} from '../../archivos/archivos.constantes';
import { Rol } from '../../comun/enums/rol.enum';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { ActualizarMazoDto, CrearMazoDto, SubirImagenMazoDto } from './dto/mazo.dto';

/** Donde puede estar una imagen de mazo: las subidas y los iconos base. */
const CARPETAS_MAZO = [CARPETA_FICHAS, CARPETA_FONDOS];

/**
 * Mazos del Memorama y del Mahjong: iconos, ficha y fondo.
 *
 * Las imagenes se suben de a una (POST imagenes) y el mazo guarda sus rutas:
 * un mazo de 24 iconos no entra en una sola peticion de 6 MB.
 */
@Injectable()
export class MazosService {
  constructor(
    @InjectRepository(Mazo)
    private readonly mazosRepo: Repository<Mazo>,
    @InjectRepository(ConfiguracionJuego)
    private readonly configuracionesRepo: Repository<ConfiguracionJuego>,
    private readonly archivos: ArchivosService,
  ) {}

  /** Los propios de la institucion mas el catalogo base de Ludus. */
  listar(quien: UsuarioAutenticado, juegoClave?: string): Promise<Mazo[]> {
    const consulta = this.mazosRepo
      .createQueryBuilder('mazo')
      .orderBy('mazo.institucionId', 'ASC', 'NULLS LAST')
      .addOrderBy('mazo.nombre', 'ASC');

    if (juegoClave) consulta.andWhere('mazo.juegoClave = :juegoClave', { juegoClave });
    if (quien.rol !== Rol.SUPERADMIN) {
      consulta.andWhere('(mazo.institucionId = :institucionId OR mazo.institucionId IS NULL)', {
        institucionId: quien.institucionId,
      });
    }
    return consulta.getMany();
  }

  async crear(quien: UsuarioAutenticado, datos: CrearMazoDto): Promise<Mazo> {
    await this.validarImagenes(datos);
    const mazo = this.mazosRepo.create({
      juegoClave: datos.juegoClave,
      nombre: datos.nombre,
      iconos: datos.iconos,
      imagenFicha: datos.imagenFicha ?? null,
      fondo: datos.fondo ?? null,
      institucionId: quien.rol === Rol.SUPERADMIN ? null : quien.institucionId,
    });
    return this.mazosRepo.save(mazo);
  }

  async actualizar(quien: UsuarioAutenticado, id: string, datos: ActualizarMazoDto): Promise<Mazo> {
    const mazo = await this.conAcceso(quien, id);
    await this.validarImagenes(datos);
    const anteriores = this.rutasDe(mazo);

    if (datos.nombre !== undefined) mazo.nombre = datos.nombre;
    if (datos.iconos !== undefined) mazo.iconos = datos.iconos;
    if (datos.imagenFicha !== undefined) mazo.imagenFicha = datos.imagenFicha;
    if (datos.fondo !== undefined) mazo.fondo = datos.fondo;
    const guardado = await this.mazosRepo.save(mazo);

    const actuales = new Set(this.rutasDe(guardado));
    await this.limpiarHuerfanas(anteriores.filter((ruta) => !actuales.has(ruta)));
    return guardado;
  }

  async eliminar(quien: UsuarioAutenticado, id: string): Promise<void> {
    const mazo = await this.conAcceso(quien, id);
    const enUso = await this.configuracionesRepo
      .createQueryBuilder('configuracion')
      .where(`configuracion.ajustes ->> 'mazoId' = :id`, { id })
      .getCount();
    if (enUso > 0) {
      throw new BadRequestException(
        `Este mazo lo usan ${enUso} modulo(s). Cambia el mazo en su configuracion antes de borrarlo.`,
      );
    }
    await this.mazosRepo.remove(mazo);
    await this.limpiarHuerfanas(this.rutasDe(mazo));
  }

  /** Copia un mazo (por ejemplo el base) para editarlo sin tocar el original. */
  async duplicar(quien: UsuarioAutenticado, id: string): Promise<Mazo> {
    const original = await this.visible(quien, id);
    const copia = this.mazosRepo.create({
      juegoClave: original.juegoClave,
      nombre: `Copia de ${original.nombre}`.slice(0, 120),
      iconos: [...original.iconos],
      imagenFicha: original.imagenFicha,
      fondo: original.fondo,
      institucionId: quien.rol === Rol.SUPERADMIN ? null : quien.institucionId,
    });
    return this.mazosRepo.save(copia);
  }

  async subirImagen(datos: SubirImagenMazoDto): Promise<{ ruta: string }> {
    const carpeta = datos.uso === 'fondo' ? CARPETA_FONDOS : CARPETA_FICHAS;
    return { ruta: await this.archivos.guardarImagen(carpeta, datos.imagen) };
  }

  /** Un mazo que quien puede usar: el suyo o uno del catalogo base. */
  async visible(quien: UsuarioAutenticado, id: string, juegoClave?: string): Promise<Mazo> {
    const mazo = await this.mazosRepo.findOne({ where: { id } });
    const ajeno =
      mazo &&
      quien.rol !== Rol.SUPERADMIN &&
      mazo.institucionId !== null &&
      mazo.institucionId !== quien.institucionId;
    if (!mazo || ajeno || (juegoClave && mazo.juegoClave !== juegoClave)) {
      throw new NotFoundException('El mazo no existe');
    }
    return mazo;
  }

  /**
   * El mazo con el que se juega. Si el que eligio el docente ya no esta, se
   * juega con el base en vez de dejar la partida rota.
   */
  async paraPartida(id: unknown, juegoClave: string): Promise<Mazo> {
    const elegido =
      typeof id === 'string' ? await this.mazosRepo.findOne({ where: { id, juegoClave } }) : null;
    if (elegido) return elegido;

    const base = await this.mazosRepo.findOne({
      where: { juegoClave, institucionId: IsNull() },
      order: { creadoEn: 'ASC' },
    });
    if (!base) throw new NotFoundException('No hay ningun mazo para este juego');
    return base;
  }

  /* ---------------------------------------------------------------- */

  private rutasDe(mazo: Mazo): string[] {
    return [...mazo.iconos, mazo.imagenFicha, mazo.fondo].filter((ruta): ruta is string => !!ruta);
  }

  /** Cada ruta tiene que ser una imagen que ya esta en el servidor. */
  private async validarImagenes(datos: ActualizarMazoDto): Promise<void> {
    const rutas = [...(datos.iconos ?? []), datos.imagenFicha, datos.fondo].filter(
      (ruta): ruta is string => !!ruta,
    );
    for (const ruta of new Set(rutas)) {
      if (!(await this.archivos.existe(ruta, CARPETAS_MAZO))) {
        throw new BadRequestException(`La imagen ${ruta} no esta en el servidor. Vuelve a subirla.`);
      }
    }
  }

  /**
   * Borra del disco las imagenes subidas que ya ningun mazo usa. Los iconos
   * base y lo que alguien copio a mano no tienen nombre de subida y se quedan.
   */
  private async limpiarHuerfanas(rutas: string[]): Promise<void> {
    for (const ruta of new Set(rutas)) {
      if (!PATRON_ARCHIVO_SUBIDO.test(ruta)) continue;
      const enUso = await this.mazosRepo
        .createQueryBuilder('mazo')
        .where('mazo.iconos @> :lista::jsonb', { lista: JSON.stringify([ruta]) })
        .orWhere('mazo.imagenFicha = :ruta', { ruta })
        .orWhere('mazo.fondo = :ruta', { ruta })
        .getCount();
      if (enUso === 0) await this.archivos.eliminarImagen(ruta);
    }
  }

  /** El catalogo base solo lo toca el superadmin. */
  private async conAcceso(quien: UsuarioAutenticado, id: string): Promise<Mazo> {
    const mazo = await this.mazosRepo.findOne({ where: { id } });
    if (!mazo) throw new NotFoundException('El mazo no existe');
    if (quien.rol === Rol.SUPERADMIN) return mazo;

    if (mazo.institucionId === null) {
      throw new ForbiddenException('El mazo base no se edita: duplicalo y cambia la copia');
    }
    if (mazo.institucionId !== quien.institucionId) {
      throw new ForbiddenException('No tienes acceso a este mazo');
    }
    return mazo;
  }
}
