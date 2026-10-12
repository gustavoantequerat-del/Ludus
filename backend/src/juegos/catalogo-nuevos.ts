/**
 * Datos de catalogo de los juegos de fichas y del Runner Narrativo. Los usan
 * la migracion (para las bases que ya existen) y la semilla (para las nuevas),
 * asi el texto vive en un solo lugar.
 */

export const CLAVE_MEMORAMA = 'memorama';
export const CLAVE_MAHJONG = 'mahjong';
export const CLAVE_RUNNER = 'runner-narrativo';

export const JUEGO_MEMORAMA = {
  clave: CLAVE_MEMORAMA,
  nombre: 'Memorama',
  categoria: 'Memoria',
  icono: 'layout-grid',
  eslogan: 'Voltea dos fichas y encuentra las parejas.',
  descripcion:
    'Voltea dos fichas por turno y encuentra las parejas iguales. Se juega por rondas: cada ronda trae un tablero nuevo.',
  parametros: ['Rondas', 'Pares', 'Volteo'],
  jugable: true,
  tipo: 'ludico' as const,
};

export const JUEGO_MAHJONG = {
  clave: CLAVE_MAHJONG,
  nombre: 'Mahjong',
  categoria: 'Fichas',
  icono: 'layers',
  eslogan: 'Libera las fichas y retira las parejas iguales.',
  descripcion:
    'Retira de a dos las fichas libres que tengan el mismo icono hasta vaciar el tablero. Una ficha esta libre si no tiene otra encima y le queda un costado sin tapar.',
  parametros: ['Mazo', 'Tamano'],
  jugable: true,
  tipo: 'ludico' as const,
};

export const JUEGO_RUNNER = {
  clave: CLAVE_RUNNER,
  nombre: 'Runner Narrativo',
  categoria: 'Narrativa',
  icono: 'clapperboard',
  eslogan: 'Una historia en video que solo avanza si respondes bien.',
  descripcion:
    'Mira la intro y responde cada pregunta. Si aciertas, la historia sigue con su video y llega la siguiente pregunta; si fallas, ves lo que pasa y la partida termina.',
  parametros: ['Historia', 'Preguntas', 'Videos'],
  jugable: true,
  tipo: 'evaluacion' as const,
};

/** Iconos que trae cada mazo base (archivos en archivos/fichas/base/). */
const NOMBRES_ICONOS_BASE = [
  'apple', 'cat', 'dog', 'fish', 'bird', 'rabbit', 'turtle', 'star',
  'heart', 'sun', 'moon', 'cloud', 'flower-2', 'tree-pine', 'rocket', 'car',
  'plane', 'music', 'gift', 'crown', 'anchor', 'umbrella', 'cake', 'leaf',
];

export function iconosBase(clave: typeof CLAVE_MEMORAMA | typeof CLAVE_MAHJONG): string[] {
  return NOMBRES_ICONOS_BASE.map((nombre) => `/archivos/fichas/base/${clave}/${nombre}.svg`);
}
