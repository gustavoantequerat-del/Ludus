/**
 * Logica del Mahjong solitario, sin nada de pantalla.
 *
 * El tablero es una pila de capas rectangulares en una grilla de fichas
 * (x, y) con altura z. Una ficha esta libre si no tiene otra encima y le
 * queda libre al menos un costado (izquierdo o derecho) en su misma capa.
 */
import { mezclar } from '@/utilidades/azar';
import type { TamanoMahjong } from '@/tipos';

export interface Ficha {
  id: number;
  x: number;
  y: number;
  z: number;
  icono: string;
  retirada: boolean;
}

interface Capa {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Piramides de capas; cada total es par para que todas las fichas tengan pareja. */
export const DISPOSICIONES: Record<TamanoMahjong, { ancho: number; alto: number; capas: Capa[] }> = {
  pequeno: {
    ancho: 6,
    alto: 4,
    capas: [
      { x: 0, y: 0, ancho: 6, alto: 4 },
      { x: 1, y: 1, ancho: 4, alto: 2 },
      { x: 2, y: 1, ancho: 2, alto: 2 },
    ],
  },
  mediano: {
    ancho: 8,
    alto: 6,
    capas: [
      { x: 0, y: 0, ancho: 8, alto: 6 },
      { x: 1, y: 1, ancho: 6, alto: 4 },
      { x: 2, y: 2, ancho: 4, alto: 2 },
    ],
  },
  grande: {
    ancho: 10,
    alto: 6,
    capas: [
      { x: 0, y: 0, ancho: 10, alto: 6 },
      { x: 1, y: 1, ancho: 8, alto: 4 },
      { x: 2, y: 2, ancho: 6, alto: 2 },
      { x: 4, y: 2, ancho: 2, alto: 2 },
    ],
  },
};

type Posicion = Pick<Ficha, 'x' | 'y' | 'z'>;

const llave = (x: number, y: number, z: number) => `${x},${y},${z}`;

function posiciones(tamano: TamanoMahjong): Posicion[] {
  return DISPOSICIONES[tamano].capas.flatMap((capa, z) =>
    Array.from({ length: capa.ancho * capa.alto }, (_, i) => ({
      x: capa.x + (i % capa.ancho),
      y: capa.y + Math.floor(i / capa.ancho),
      z,
    })),
  );
}

/** Libre dentro de un conjunto de posiciones ocupadas. */
function libreEn(p: Posicion, ocupadas: Set<string>): boolean {
  if (ocupadas.has(llave(p.x, p.y, p.z + 1))) return false;
  const izquierda = ocupadas.has(llave(p.x - 1, p.y, p.z));
  const derecha = ocupadas.has(llave(p.x + 1, p.y, p.z));
  return !izquierda || !derecha;
}

export function estaLibre(ficha: Ficha, fichas: Ficha[]): boolean {
  const ocupadas = new Set(fichas.filter((f) => !f.retirada).map((f) => llave(f.x, f.y, f.z)));
  return libreEn(ficha, ocupadas);
}

/**
 * Reparte los iconos de a pares "jugando al reves": desde el tablero lleno,
 * toma dos fichas que esten libres, les pone el mismo icono y las saca. Ese
 * orden es una forma valida de vaciar el tablero, asi que siempre tiene
 * solucion. Si se traba antes de terminar, vuelve a intentar.
 */
function repartir(lugares: Posicion[], iconosPorPar: string[]): Map<string, string> | null {
  for (let intento = 0; intento < 60; intento++) {
    const ocupadas = new Set(lugares.map((p) => llave(p.x, p.y, p.z)));
    const asignados = new Map<string, string>();
    let trabado = false;
    for (const icono of mezclar(iconosPorPar)) {
      const libres = mezclar(lugares.filter((p) => ocupadas.has(llave(p.x, p.y, p.z)) && libreEn(p, ocupadas)));
      if (libres.length < 2) {
        trabado = true;
        break;
      }
      for (const p of libres.slice(0, 2)) {
        asignados.set(llave(p.x, p.y, p.z), icono);
        ocupadas.delete(llave(p.x, p.y, p.z));
      }
    }
    if (!trabado) return asignados;
  }
  return null;
}

/** Cada icono va en dos pares (cuatro fichas), como en el Mahjong clasico. */
function iconosParaPares(cantidadPares: number, iconos: string[]): string[] {
  const elegidos = mezclar(iconos);
  return Array.from({ length: cantidadPares }, (_, i) => elegidos[Math.floor(i / 2) % elegidos.length]);
}

export function generar(tamano: TamanoMahjong, iconos: string[]): Ficha[] {
  const lugares = posiciones(tamano);
  const asignados = repartir(lugares, iconosParaPares(lugares.length / 2, iconos));
  if (!asignados) throw new Error('No se pudo armar el tablero');
  return lugares.map((p, id) => ({ ...p, id, icono: asignados.get(llave(p.x, p.y, p.z))!, retirada: false }));
}

/**
 * Vuelve a repartir los iconos que quedan, otra vez con solucion asegurada.
 * null si la forma que quedo no tiene salida con ningun reparto (por ejemplo
 * dos fichas una encima de la otra): eso no lo arregla barajar.
 */
export function barajar(fichas: Ficha[]): Ficha[] | null {
  const quedan = fichas.filter((f) => !f.retirada);
  const conteo = new Map<string, number>();
  quedan.forEach((f) => conteo.set(f.icono, (conteo.get(f.icono) ?? 0) + 1));
  const iconosPorPar = [...conteo.entries()].flatMap(([icono, n]) => Array(n / 2).fill(icono));
  const asignados = repartir(quedan, iconosPorPar);
  if (!asignados) return null;
  return fichas.map((f) => (f.retirada ? f : { ...f, icono: asignados.get(llave(f.x, f.y, f.z))! }));
}

/** Una pareja libre para jugar, o null si no queda ninguna. */
export function pista(fichas: Ficha[]): [Ficha, Ficha] | null {
  const libres = fichas.filter((f) => !f.retirada && estaLibre(f, fichas));
  for (let i = 0; i < libres.length; i++) {
    const igual = libres.slice(i + 1).find((f) => f.icono === libres[i].icono);
    if (igual) return [libres[i], igual];
  }
  return null;
}
