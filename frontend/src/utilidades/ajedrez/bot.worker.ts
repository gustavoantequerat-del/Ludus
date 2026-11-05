/**
 * El bot piensa en un hilo aparte: el tablero y las animaciones siguen
 * fluidos mientras busca su jugada.
 */
import { elegirJugada } from './bot';
import type { Posicion } from './motor';

self.onmessage = (evento: MessageEvent<{ id: number; posicion: Posicion }>) => {
  const { id, posicion } = evento.data;
  self.postMessage({ id, jugada: elegirJugada(posicion) });
};
