/**
 * Reglas del Ajedrez de Preguntas, sin dependencias ni Vue.
 *
 * Es ajedrez normal (enroque, captura al paso, coronacion a dama) con una
 * diferencia: una captura puede FALLAR. Si el estudiante responde mal, la
 * pieza que muere es la suya, ataque o defienda. Por eso `aplicar` recibe si
 * la captura tuvo exito o no:
 *
 * - exito: como en el ajedrez de siempre.
 * - fracaso: el atacante desaparece de su casilla y la pieza atacada se queda.
 *
 * Las jugadas legales se calculan como siempre (suponiendo que la captura
 * sale bien). Un fracaso puede dejar al rey de quien ataco en jaque: el rival
 * no se lo puede comer (aqui nadie captura reyes); quien quedo en jaque lo
 * resuelve en su turno, como en cualquier jaque.
 *
 * Este archivo se compila tambien para el paquete SCORM (ajedrez-motor.js),
 * asi que no importa nada del proyecto.
 */

export type Color = 'b' | 'n';
/** peon, caballo, alfil, torre, dama, rey */
export type TipoPieza = 'p' | 'c' | 'a' | 't' | 'd' | 'r';

export interface Pieza {
  tipo: TipoPieza;
  color: Color;
}

/** 0 = a8, 7 = h8, 56 = a1, 63 = h1: la fila 0 es la de arriba (negras). */
export type Casilla = number;

export interface Enroques {
  blancasCorto: boolean;
  blancasLargo: boolean;
  negrasCorto: boolean;
  negrasLargo: boolean;
}

export interface Posicion {
  tablero: (Pieza | null)[];
  turno: Color;
  enroques: Enroques;
  /** Casilla a la que se puede capturar al paso, o null. */
  alPaso: Casilla | null;
}

export interface Jugada {
  desde: Casilla;
  hasta: Casilla;
  pieza: TipoPieza;
  /** Pieza que se intenta capturar (null si no hay captura). */
  captura: TipoPieza | null;
  /** Donde esta la pieza capturada: distinta de `hasta` solo al paso. */
  casillaCaptura: Casilla | null;
  promocion: TipoPieza | null;
  enroque: 'corto' | 'largo' | null;
}

export type Final = 'mate' | 'ahogado' | 'material' | null;

export const contrario = (color: Color): Color => (color === 'b' ? 'n' : 'b');
export const fila = (c: Casilla) => Math.floor(c / 8);
export const columna = (c: Casilla) => c % 8;

const LETRAS = 'abcdefgh';

/** "e4" -> 36 */
export function casillaDe(nombre: string): Casilla {
  return (8 - Number(nombre[1])) * 8 + LETRAS.indexOf(nombre[0]);
}

/** 36 -> "e4" */
export function nombreDe(c: Casilla): string {
  return LETRAS[columna(c)] + (8 - fila(c));
}

const FILA_INICIAL: TipoPieza[] = ['t', 'c', 'a', 'd', 'r', 'a', 'c', 't'];

export function posicionInicial(): Posicion {
  const tablero: (Pieza | null)[] = new Array(64).fill(null);
  for (let col = 0; col < 8; col++) {
    tablero[col] = { tipo: FILA_INICIAL[col], color: 'n' };
    tablero[8 + col] = { tipo: 'p', color: 'n' };
    tablero[48 + col] = { tipo: 'p', color: 'b' };
    tablero[56 + col] = { tipo: FILA_INICIAL[col], color: 'b' };
  }
  return {
    tablero,
    turno: 'b',
    enroques: { blancasCorto: true, blancasLargo: true, negrasCorto: true, negrasLargo: true },
    alPaso: null,
  };
}

/** Solo para pruebas: lee una FEN (las cuatro primeras partes). */
export function desdeFen(fen: string): Posicion {
  const [filas, turno, enroques, alPaso] = fen.trim().split(/\s+/);
  const letras: Record<string, TipoPieza> = { p: 'p', n: 'c', b: 'a', r: 't', q: 'd', k: 'r' };
  const tablero: (Pieza | null)[] = [];
  for (const caracter of filas.replace(/\//g, '')) {
    if (/\d/.test(caracter)) {
      for (let i = 0; i < Number(caracter); i++) tablero.push(null);
    } else {
      const minuscula = caracter.toLowerCase();
      tablero.push({ tipo: letras[minuscula], color: caracter === minuscula ? 'n' : 'b' });
    }
  }
  return {
    tablero,
    turno: turno === 'b' ? 'n' : 'b',
    enroques: {
      blancasCorto: enroques.includes('K'),
      blancasLargo: enroques.includes('Q'),
      negrasCorto: enroques.includes('k'),
      negrasLargo: enroques.includes('q'),
    },
    alPaso: alPaso && alPaso !== '-' ? casillaDe(alPaso) : null,
  };
}

/* ------------------------------------------------------------------ *
 * Ataques
 * ------------------------------------------------------------------ */

const SALTOS_CABALLO: [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1],
];
const PASOS_REY: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
];
const DIAGONALES: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const RECTAS: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

function dentro(f: number, c: number): boolean {
  return f >= 0 && f < 8 && c >= 0 && c < 8;
}

/** Si alguna pieza de `porColor` ataca la casilla. */
export function casillaAtacada(pos: Posicion, casilla: Casilla, porColor: Color): boolean {
  const t = pos.tablero;
  const f = fila(casilla);
  const c = columna(casilla);

  // Peones: atacan en diagonal hacia adelante, asi que se buscan hacia atras.
  const filaPeon = porColor === 'b' ? f + 1 : f - 1;
  for (const dc of [-1, 1]) {
    if (dentro(filaPeon, c + dc)) {
      const p = t[filaPeon * 8 + c + dc];
      if (p && p.color === porColor && p.tipo === 'p') return true;
    }
  }
  for (const [df, dc] of SALTOS_CABALLO) {
    if (dentro(f + df, c + dc)) {
      const p = t[(f + df) * 8 + c + dc];
      if (p && p.color === porColor && p.tipo === 'c') return true;
    }
  }
  for (const [df, dc] of PASOS_REY) {
    if (dentro(f + df, c + dc)) {
      const p = t[(f + df) * 8 + c + dc];
      if (p && p.color === porColor && p.tipo === 'r') return true;
    }
  }
  const deslizar = (direcciones: [number, number][], tipos: TipoPieza[]) => {
    for (const [df, dc] of direcciones) {
      let nf = f + df;
      let nc = c + dc;
      while (dentro(nf, nc)) {
        const p = t[nf * 8 + nc];
        if (p) {
          if (p.color === porColor && tipos.includes(p.tipo)) return true;
          break;
        }
        nf += df;
        nc += dc;
      }
    }
    return false;
  };
  return deslizar(DIAGONALES, ['a', 'd']) || deslizar(RECTAS, ['t', 'd']);
}

export function casillaDelRey(pos: Posicion, color: Color): Casilla | null {
  const indice = pos.tablero.findIndex((p) => p !== null && p.tipo === 'r' && p.color === color);
  return indice >= 0 ? indice : null;
}

export function enJaque(pos: Posicion, color: Color): boolean {
  const rey = casillaDelRey(pos, color);
  return rey !== null && casillaAtacada(pos, rey, contrario(color));
}

/* ------------------------------------------------------------------ *
 * Jugadas
 * ------------------------------------------------------------------ */

function nueva(
  desde: Casilla,
  hasta: Casilla,
  pieza: TipoPieza,
  captura: TipoPieza | null,
  extra: Partial<Jugada> = {},
): Jugada {
  return {
    desde,
    hasta,
    pieza,
    captura,
    casillaCaptura: captura ? hasta : null,
    promocion: null,
    enroque: null,
    ...extra,
  };
}

/** Jugadas posibles sin mirar si dejan al propio rey en jaque. Nunca capturan un rey. */
function jugadasPosibles(pos: Posicion): Jugada[] {
  const jugadas: Jugada[] = [];
  const t = pos.tablero;
  const yo = pos.turno;

  const agregar = (desde: Casilla, hasta: Casilla, tipo: TipoPieza) => {
    const destino = t[hasta];
    if (destino && (destino.color === yo || destino.tipo === 'r')) return false;
    jugadas.push(nueva(desde, hasta, tipo, destino ? destino.tipo : null));
    return !destino;
  };

  for (let desde = 0; desde < 64; desde++) {
    const pieza = t[desde];
    if (!pieza || pieza.color !== yo) continue;
    const f = fila(desde);
    const c = columna(desde);

    if (pieza.tipo === 'p') {
      const avance = yo === 'b' ? -1 : 1;
      const inicio = yo === 'b' ? 6 : 1;
      const ultima = yo === 'b' ? 0 : 7;
      const nf = f + avance;
      if (!dentro(nf, c)) continue;
      const corona = nf === ultima;
      const uno = nf * 8 + c;
      if (!t[uno]) {
        jugadas.push(nueva(desde, uno, 'p', null, { promocion: corona ? 'd' : null }));
        const dos = (f + 2 * avance) * 8 + c;
        if (f === inicio && !t[dos]) jugadas.push(nueva(desde, dos, 'p', null));
      }
      for (const dc of [-1, 1]) {
        if (!dentro(nf, c + dc)) continue;
        const hasta = nf * 8 + c + dc;
        const destino = t[hasta];
        if (destino && destino.color !== yo && destino.tipo !== 'r') {
          jugadas.push(nueva(desde, hasta, 'p', destino.tipo, { promocion: corona ? 'd' : null }));
        } else if (hasta === pos.alPaso) {
          const capturada = f * 8 + c + dc;
          const victima = t[capturada];
          if (victima && victima.tipo === 'p' && victima.color !== yo) {
            jugadas.push(nueva(desde, hasta, 'p', 'p', { casillaCaptura: capturada }));
          }
        }
      }
      continue;
    }

    if (pieza.tipo === 'c' || pieza.tipo === 'r') {
      const saltos = pieza.tipo === 'c' ? SALTOS_CABALLO : PASOS_REY;
      for (const [df, dc] of saltos) {
        if (dentro(f + df, c + dc)) agregar(desde, (f + df) * 8 + c + dc, pieza.tipo);
      }
      if (pieza.tipo === 'r') jugadas.push(...enroques(pos, desde));
      continue;
    }

    const direcciones =
      pieza.tipo === 'a' ? DIAGONALES : pieza.tipo === 't' ? RECTAS : [...DIAGONALES, ...RECTAS];
    for (const [df, dc] of direcciones) {
      let nf = f + df;
      let nc = c + dc;
      while (dentro(nf, nc) && agregar(desde, nf * 8 + nc, pieza.tipo)) {
        nf += df;
        nc += dc;
      }
    }
  }
  return jugadas;
}

function enroques(pos: Posicion, desde: Casilla): Jugada[] {
  const yo = pos.turno;
  const filaRey = yo === 'b' ? 7 : 0;
  if (desde !== filaRey * 8 + 4) return [];
  const rival = contrario(yo);
  if (casillaAtacada(pos, desde, rival)) return [];
  const t = pos.tablero;
  const resultado: Jugada[] = [];
  const torre = (col: number) => {
    const p = t[filaRey * 8 + col];
    return p !== null && p.tipo === 't' && p.color === yo;
  };
  const libres = (cols: number[]) => cols.every((col) => !t[filaRey * 8 + col]);
  const seguras = (cols: number[]) => cols.every((col) => !casillaAtacada(pos, filaRey * 8 + col, rival));

  const corto = yo === 'b' ? pos.enroques.blancasCorto : pos.enroques.negrasCorto;
  const largo = yo === 'b' ? pos.enroques.blancasLargo : pos.enroques.negrasLargo;
  if (corto && torre(7) && libres([5, 6]) && seguras([5, 6])) {
    resultado.push(nueva(desde, filaRey * 8 + 6, 'r', null, { enroque: 'corto' }));
  }
  if (largo && torre(0) && libres([1, 2, 3]) && seguras([2, 3])) {
    resultado.push(nueva(desde, filaRey * 8 + 2, 'r', null, { enroque: 'largo' }));
  }
  return resultado;
}

/**
 * Aplica una jugada y devuelve la posicion nueva (no modifica la original).
 * Con `capturaExitosa = false`, el atacante muere y la pieza atacada se queda.
 */
export function aplicar(pos: Posicion, jugada: Jugada, capturaExitosa = true): Posicion {
  const tablero = pos.tablero.slice();
  const enroquesNuevos = { ...pos.enroques };
  const pieza = tablero[jugada.desde]!;
  const fracaso = jugada.captura !== null && !capturaExitosa;

  tablero[jugada.desde] = null;
  if (!fracaso) {
    if (jugada.casillaCaptura !== null) tablero[jugada.casillaCaptura] = null;
    tablero[jugada.hasta] = jugada.promocion ? { tipo: jugada.promocion, color: pieza.color } : pieza;
    if (jugada.enroque) {
      const filaRey = fila(jugada.desde);
      const [origen, destino] = jugada.enroque === 'corto' ? [7, 5] : [0, 3];
      tablero[filaRey * 8 + destino] = tablero[filaRey * 8 + origen];
      tablero[filaRey * 8 + origen] = null;
    }
  }

  // Un rey o una torre que se mueve (o muere), o una torre capturada, pierde el enroque.
  const tocar = (casilla: Casilla) => {
    if (casilla === 60) { enroquesNuevos.blancasCorto = false; enroquesNuevos.blancasLargo = false; }
    if (casilla === 4) { enroquesNuevos.negrasCorto = false; enroquesNuevos.negrasLargo = false; }
    if (casilla === 63) enroquesNuevos.blancasCorto = false;
    if (casilla === 56) enroquesNuevos.blancasLargo = false;
    if (casilla === 7) enroquesNuevos.negrasCorto = false;
    if (casilla === 0) enroquesNuevos.negrasLargo = false;
  };
  tocar(jugada.desde);
  if (!fracaso) tocar(jugada.hasta);

  const doble = pieza.tipo === 'p' && Math.abs(jugada.hasta - jugada.desde) === 16;
  return {
    tablero,
    turno: contrario(pos.turno),
    enroques: enroquesNuevos,
    alPaso: doble && !fracaso ? (jugada.desde + jugada.hasta) / 2 : null,
  };
}

/** Jugadas que no dejan al propio rey en jaque (suponiendo que la captura sale bien). */
export function jugadasLegales(pos: Posicion): Jugada[] {
  const yo = pos.turno;
  return jugadasPosibles(pos).filter((jugada) => !enJaque(aplicar(pos, jugada), yo));
}

export function jugadasDesde(pos: Posicion, desde: Casilla): Jugada[] {
  return jugadasLegales(pos).filter((j) => j.desde === desde);
}

/** Solo reyes, o rey contra rey y un alfil o un caballo: nadie puede dar mate. */
function materialInsuficiente(pos: Posicion): boolean {
  const resto = pos.tablero.filter((p): p is Pieza => p !== null && p.tipo !== 'r');
  if (resto.length === 0) return true;
  return resto.length === 1 && (resto[0].tipo === 'a' || resto[0].tipo === 'c');
}

/** Como termina la posicion para quien tiene el turno, o null si sigue. */
export function finalDe(pos: Posicion): Final {
  if (jugadasLegales(pos).length === 0) return enJaque(pos, pos.turno) ? 'mate' : 'ahogado';
  if (materialInsuficiente(pos)) return 'material';
  return null;
}

/** "e2-e4", "Cxe5", "O-O": para la lista de jugadas. */
export function notacion(jugada: Jugada): string {
  if (jugada.enroque) return jugada.enroque === 'corto' ? 'O-O' : 'O-O-O';
  const letra: Record<TipoPieza, string> = { p: '', c: 'C', a: 'A', t: 'T', d: 'D', r: 'R' };
  const separador = jugada.captura ? 'x' : '-';
  const coronacion = jugada.promocion ? '=D' : '';
  return `${letra[jugada.pieza]}${nombreDe(jugada.desde)}${separador}${nombreDe(jugada.hasta)}${coronacion}`;
}

/** Cuenta jugadas hasta una profundidad: sirve para comprobar las reglas. */
export function perft(pos: Posicion, profundidad: number): number {
  if (profundidad === 0) return 1;
  let total = 0;
  for (const jugada of jugadasLegales(pos)) total += perft(aplicar(pos, jugada), profundidad - 1);
  return total;
}
