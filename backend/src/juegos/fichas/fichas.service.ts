import { BadRequestException, Injectable } from '@nestjs/common';
import { MazosService } from './mazos.service';
import { AccesoModuloService } from '../acceso-modulo.service';
import { CLAVE_MAHJONG, CLAVE_MEMORAMA } from '../catalogo-nuevos';
import { UsuarioAutenticado } from '../../comun/tipos/usuario-autenticado';
import { Velocidad } from '../configuracion-juego.entidad';
import { Mazo } from './mazo.entidad';

/**
 * Cuanto quedan a la vista dos fichas que no son pareja antes de volver a
 * voltearse. Es la "velocidad de volteo" que elige el docente.
 */
export const VOLTEO_MS: Record<Velocidad, number> = { baja: 1600, media: 1000, alta: 550 };

export const RONDAS = { minimo: 1, maximo: 5 };
export const PARES_MEMORAMA = { minimo: 4, maximo: 12 };
export const TAMANOS_MAHJONG = ['pequeno', 'mediano', 'grande'] as const;

type TamanoMahjong = (typeof TAMANOS_MAHJONG)[number];

/** Memorama y Mahjong: lo que se configura por modulo y la partida. */
@Injectable()
export class FichasService {
  constructor(
    private readonly mazos: MazosService,
    private readonly acceso: AccesoModuloService,
  ) {}

  /**
   * Ajustes validos para guardar en la configuracion del modulo. Lo que no
   * se reconoce se descarta.
   */
  async validarAjustes(
    quien: UsuarioAutenticado,
    clave: string,
    ajustes: Record<string, unknown>,
    paresContenido: number,
  ): Promise<Record<string, unknown>> {
    const mazo =
      typeof ajustes.mazoId === 'string'
        ? await this.mazos.visible(quien, ajustes.mazoId, clave)
        : await this.mazos.paraPartida(null, clave);

    if (clave === CLAVE_MAHJONG) {
      const tamano = (ajustes.tamano ?? 'mediano') as TamanoMahjong;
      if (!TAMANOS_MAHJONG.includes(tamano)) {
        throw new BadRequestException('El tamano del tablero no es valido');
      }
      return { mazoId: mazo.id, tamano };
    }

    const rondas = ajustes.rondas ?? 1;
    if (!Number.isInteger(rondas) || (rondas as number) < RONDAS.minimo || (rondas as number) > RONDAS.maximo) {
      throw new BadRequestException(`Las rondas van de ${RONDAS.minimo} a ${RONDAS.maximo}`);
    }
    if (paresContenido < PARES_MEMORAMA.minimo || paresContenido > PARES_MEMORAMA.maximo) {
      throw new BadRequestException(
        `El Memorama usa de ${PARES_MEMORAMA.minimo} a ${PARES_MEMORAMA.maximo} pares por ronda`,
      );
    }
    if (paresContenido > mazo.iconos.length) {
      throw new BadRequestException(
        `El mazo "${mazo.nombre}" tiene ${mazo.iconos.length} iconos: alcanza para ${mazo.iconos.length} pares como maximo.`,
      );
    }
    return { mazoId: mazo.id, rondas };
  }

  async armarPartida(quien: UsuarioAutenticado, moduloId: string, clave: string) {
    const configuracion = await this.acceso.configuracionDe(quien, moduloId, clave);
    const mazo = await this.mazos.paraPartida(configuracion.ajustes.mazoId, clave);
    const comun = {
      juego: { clave, nombre: configuracion.juego.nombre },
      titulo: configuracion.titulo,
      instrucciones: configuracion.instrucciones,
      mazo: this.mazoPublico(mazo),
    };

    if (clave === CLAVE_MEMORAMA) {
      return {
        ...comun,
        rondas: (configuracion.ajustes.rondas as number) ?? 1,
        paresPorRonda: Math.min(configuracion.paresContenido, mazo.iconos.length),
        volteoMs: VOLTEO_MS[configuracion.velocidad] ?? VOLTEO_MS.media,
      };
    }
    return { ...comun, tamano: (configuracion.ajustes.tamano as TamanoMahjong) ?? 'mediano' };
  }

  private mazoPublico(mazo: Mazo) {
    return {
      nombre: mazo.nombre,
      iconos: mazo.iconos,
      imagenFicha: mazo.imagenFicha,
      fondo: mazo.fondo,
    };
  }
}
