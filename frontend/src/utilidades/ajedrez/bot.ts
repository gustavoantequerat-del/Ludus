/**
 * Bot del Ajedrez de Preguntas: nivel intermedio.
 *
 * Busca 3 jugadas adelante (minimax con poda alfa-beta) y evalua material y
 * posicion de las piezas. No sabe que las capturas dependen de una pregunta:
 * juega como si siempre salieran bien. Para no ser predecible, entre las
 * jugadas casi igual de buenas elige una al azar.
 *
 * La dificultad del bot no decide la nota: la nota sale de las preguntas.
 */
import {
  aplicar,
  enJaque,
  jugadasLegales,
  type Color,
  type Jugada,
  type Pieza,
  type Posicion,
  type TipoPieza,
} from './motor';

export const PROFUNDIDAD_INTERMEDIA = 3;
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
    (j.captura ? 10 * VALOR[j.captura] - VALOR[j.pieza] : 0) + (j.promocion ? 800 : 0);
  return jugadas.sort((x, y) => puntaje(y) - puntaje(x));
}

function negamax(pos: Posicion, profundidad: number, alfa: number, beta: number): number {
  const jugadas = jugadasLegales(pos);
  if (jugadas.length === 0) {
    // Mate (peor cuanto antes) o ahogado.
    return enJaque(pos, pos.turno) ? -MATE - profundidad : 0;
  }
  if (profundidad === 0) return evaluar(pos, pos.turno);

  let mejor = -Infinity;
  for (const jugada of ordenar(jugadas)) {
    const valor = -negamax(aplicar(pos, jugada), profundidad - 1, -beta, -alfa);
    if (valor > mejor) mejor = valor;
    if (valor > alfa) alfa = valor;
    if (alfa >= beta) break;
  }
  return mejor;
}

/** La jugada del bot para quien tiene el turno, o null si no tiene jugadas. */
export function elegirJugada(pos: Posicion, profundidad = PROFUNDIDAD_INTERMEDIA): Jugada | null {
  const jugadas = ordenar(jugadasLegales(pos));
  if (jugadas.length === 0) return null;

  const valoradas = jugadas.map((jugada) => ({
    jugada,
    // Ventana completa en la raiz: se necesita el valor real de cada jugada
    // para elegir al azar entre las mejores.
    valor: -negamax(aplicar(pos, jugada), profundidad - 1, -Infinity, Infinity),
  }));
  const mejor = Math.max(...valoradas.map((v) => v.valor));
  const candidatas = valoradas.filter((v) => v.valor >= mejor - MARGEN_AZAR);
  return candidatas[Math.floor(Math.random() * candidatas.length)].jugada;
}
