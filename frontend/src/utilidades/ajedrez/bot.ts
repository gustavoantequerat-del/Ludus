/**
 * Bot del Ajedrez de Preguntas: nivel intermedio.
 *
 * Busca 3 jugadas adelante (negamax con poda alfa-beta, con un tope de
 * tiempo) y evalua material y posicion de las piezas. No sabe que las capturas dependen de una pregunta:
 * juega como si siempre salieran bien. Para no ser predecible, entre las
 * jugadas casi igual de buenas elige una al azar.
 *
 * La dificultad del bot no decide la nota: la nota sale de las preguntas.
 */
import {
  aplicar,
  casillaDelRey,
  enJaque,
  jugadasLegales,
  jugadasPosibles,
  type Color,
  type Jugada,
  type Pieza,
  type Posicion,
  type TipoPieza,
} from './motor';

export const PROFUNDIDAD_INTERMEDIA = 3;
/** Tope de tiempo de pensar: si la busqueda completa no entra, juega con la anterior. */
export const TIEMPO_MAXIMO_MS = 900;
/** Jugadas a menos de esto (centipeones) de la mejor se consideran iguales. */
const MARGEN_AZAR = 20;
const MATE = 100000;

const VALOR: Record<TipoPieza, number> = { p: 100, c: 320, a: 330, t: 500, d: 900, r: 0 };

/*
 * Bonos por casilla, vistos desde las blancas (fila 0 = octava). Para las
 * negras se lee la tabla espejada. Valores clasicos simplificados.
 */
const TABLAS: Record<TipoPieza, number[]> = {
  p: [
    0, 0, 0, 0, 0, 0, 0, 0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0,
    5, -5, -10, 0, 0, -10, -5, 5,
    5, 10, 10, -20, -20, 10, 10, 5,
    0, 0, 0, 0, 0, 0, 0, 0,
  ],
  c: [
    -50, -40, -30, -30, -30, -30, -40, -50,
    -40, -20, 0, 0, 0, 0, -20, -40,
    -30, 0, 10, 15, 15, 10, 0, -30,
    -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30,
    -30, 5, 10, 15, 15, 10, 5, -30,
    -40, -20, 0, 5, 5, 0, -20, -40,
    -50, -40, -30, -30, -30, -30, -40, -50,
  ],
  a: [
    -20, -10, -10, -10, -10, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 10, 10, 5, 0, -10,
    -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10,
    -10, 10, 10, 10, 10, 10, 10, -10,
    -10, 5, 0, 0, 0, 0, 5, -10,
    -20, -10, -10, -10, -10, -10, -10, -20,
  ],
  t: [
    0, 0, 0, 0, 0, 0, 0, 0,
    5, 10, 10, 10, 10, 10, 10, 5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5,
    0, 0, 0, 5, 5, 0, 0, 0,
  ],
  d: [
    -20, -10, -10, -5, -5, -10, -10, -20,
    -10, 0, 0, 0, 0, 0, 0, -10,
    -10, 0, 5, 5, 5, 5, 0, -10,
    -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5,
    -10, 5, 5, 5, 5, 5, 0, -10,
    -10, 0, 5, 0, 0, 0, 0, -10,
    -20, -10, -10, -5, -5, -10, -10, -20,
  ],
  r: [
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20,
    -10, -20, -20, -20, -20, -20, -20, -10,
    20, 20, 0, 0, 0, 0, 20, 20,
    20, 30, 10, 0, 0, 10, 30, 20,
  ],
};

function valorPieza(pieza: Pieza, casilla: number): number {
  const indice = pieza.color === 'b' ? casilla : (7 - Math.floor(casilla / 8)) * 8 + (casilla % 8);
  return VALOR[pieza.tipo] + TABLAS[pieza.tipo][indice];
}

/** Ventaja de `color` en centipeones. */
function evaluar(pos: Posicion, color: Color): number {
  let total = 0;
  pos.tablero.forEach((pieza, casilla) => {
    if (!pieza) return;
    const valor = valorPieza(pieza, casilla);
    total += pieza.color === color ? valor : -valor;
  });
  return total;
}

/** Primero las capturas de piezas valiosas con piezas baratas: la poda corta antes. */
function ordenar(jugadas: Jugada[]): Jugada[] {
  const puntaje = (j: Jugada) =>
    (j.captura ? (j.captura === 'r' ? 100000 : 10 * VALOR[j.captura] - VALOR[j.pieza]) : 0) +
    (j.promocion ? 800 : 0);
  return jugadas.sort((x, y) => puntaje(y) - puntaje(x));
}

/**
 * Negamax con poda alfa-beta sobre las jugadas posibles (sin filtrar las que
 * dejan el rey en jaque: es mucho mas rapido). Una jugada ilegal se descubre
 * sola, porque el rival puede comerse el rey en la jugada siguiente.
 */
function buscar(pos: Posicion, profundidad: number, alfa: number, beta: number, ply: number): number {
  // Sin rey: esta partida ya se perdio.
  if (casillaDelRey(pos, pos.turno) === null) return -MATE + ply;
  const jugadas = jugadasPosibles(pos);
  // Si se puede comer el rey rival, se gana (o el rival dejo su rey colgado).
  if (jugadas.some((j) => j.captura === 'r')) return MATE - ply;
  if (profundidad === 0) return evaluar(pos, pos.turno);

  const ilegal = -(MATE - ply - 1);
  let mejor = -Infinity;
  let legales = 0;
  for (const jugada of ordenar(jugadas)) {
    const valor = -buscar(aplicar(pos, jugada), profundidad - 1, -beta, -alfa, ply + 1);
    if (valor === ilegal) continue;
    legales++;
    if (valor > mejor) mejor = valor;
    if (valor > alfa) alfa = valor;
    if (alfa >= beta) break;
  }
  if (legales === 0) {
    // Ninguna jugada sirve: mate si esta en jaque, ahogado si no.
    return enJaque(pos, pos.turno) ? -MATE + ply : 0;
  }
  return mejor;
}

function valorar(pos: Posicion, jugadas: Jugada[], profundidad: number) {
  return jugadas.map((jugada) => ({
    jugada,
    // Ventana completa en la raiz: se necesita el valor real de cada jugada
    // para elegir al azar entre las mejores.
    valor: -buscar(aplicar(pos, jugada), profundidad - 1, -Infinity, Infinity, 1),
  }));
}

/**
 * La jugada del bot para quien tiene el turno, o null si no tiene jugadas.
 * Profundiza de a una jugada y se queda con la ultima busqueda completa si
 * la siguiente no entra en el tiempo: asi nunca hace esperar de mas.
 */
export function elegirJugada(
  pos: Posicion,
  profundidad = PROFUNDIDAD_INTERMEDIA,
  tiempoMaximoMs = TIEMPO_MAXIMO_MS,
): Jugada | null {
  const jugadas = ordenar(jugadasLegales(pos));
  if (jugadas.length === 0) return null;
  // Comerse el rey expuesto siempre es la mejor jugada.
  const alRey = jugadas.find((j) => j.captura === 'r');
  if (alRey) return alRey;

  const inicio = Date.now();
  let valoradas = valorar(pos, jugadas, 1);
  for (let p = 2; p <= profundidad; p++) {
    // Cada nivel cuesta unas 6 a 10 veces el anterior: si no va a entrar, no se empieza.
    if ((Date.now() - inicio) * 8 > tiempoMaximoMs) break;
    valoradas = valorar(pos, jugadas, p);
  }
  const mejor = Math.max(...valoradas.map((v) => v.valor));
  const candidatas = valoradas.filter((v) => v.valor >= mejor - MARGEN_AZAR);
  return candidatas[Math.floor(Math.random() * candidatas.length)].jugada;
}
