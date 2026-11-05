/**
 * Identidad de cada pieza entre una posicion y la siguiente, para animarla:
 * la pieza que se mueve conserva su id (y se desliza), la que muere sale con
 * su propia animacion. El motor solo conoce casillas; esto es para dibujar.
 */
import { columna, fila, type Casilla, type Color, type Jugada, type Posicion, type TipoPieza } from './motor';

export interface PiezaEnTablero {
  id: number;
  tipo: TipoPieza;
  color: Color;
  casilla: Casilla;
}

let siguiente = 1;

export function piezasDe(pos: Posicion): PiezaEnTablero[] {
  const piezas: PiezaEnTablero[] = [];
  pos.tablero.forEach((pieza, casilla) => {
    if (pieza) piezas.push({ id: siguiente++, tipo: pieza.tipo, color: pieza.color, casilla });
  });
  return piezas;
}

/**
 * Las piezas de `nueva` (resultado de aplicar `jugada`) con los ids de antes,
 * y las que cayeron en la jugada.
 */
export function moverPiezas(
  antes: PiezaEnTablero[],
  jugada: Jugada,
  exito: boolean,
  nueva: Posicion,
): { piezas: PiezaEnTablero[]; caidas: PiezaEnTablero[] } {
  const enCasilla = new Map(antes.map((p) => [p.casilla, p]));
  const idPor = new Map<Casilla, number>();
  antes.forEach((p) => idPor.set(p.casilla, p.id));
  const caidas: PiezaEnTablero[] = [];
  const caer = (casilla: Casilla) => {
    const pieza = enCasilla.get(casilla);
    if (pieza) caidas.push(pieza);
    idPor.delete(casilla);
  };

  const atacante = idPor.get(jugada.desde);
  if (jugada.captura && !exito) {
    caer(jugada.desde);
  } else {
    if (jugada.casillaCaptura !== null) caer(jugada.casillaCaptura);
    idPor.delete(jugada.desde);
    if (atacante !== undefined) idPor.set(jugada.hasta, atacante);
    if (jugada.enroque) {
      const base = fila(jugada.desde) * 8;
      const [origen, destino] = jugada.enroque === 'corto' ? [7, 5] : [0, 3];
      const torre = idPor.get(base + origen);
      idPor.delete(base + origen);
      if (torre !== undefined) idPor.set(base + destino, torre);
    }
  }

  const piezas: PiezaEnTablero[] = [];
  nueva.tablero.forEach((pieza, casilla) => {
    if (pieza) piezas.push({ id: idPor.get(casilla) ?? siguiente++, tipo: pieza.tipo, color: pieza.color, casilla });
  });
  return { piezas, caidas };
}

/** Desplazamiento de una casilla dentro del tablero, en unidades de casilla. */
export function coordenadas(casilla: Casilla) {
  return { x: columna(casilla), y: fila(casilla) };
}
