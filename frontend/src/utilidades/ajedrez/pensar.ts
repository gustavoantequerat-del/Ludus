/**
 * Pide la jugada del bot al Worker. Si el navegador no puede crear el Worker,
 * la calcula aqui mismo (mas lento para la pantalla, pero funciona igual).
 */
import { elegirJugada } from './bot';
import type { Jugada, Posicion } from './motor';

let trabajador: Worker | null = null;
let fallo = false;
let pedido = 0;
/** Se guarda la posicion: si el Worker falla, se calcula aqui y nadie queda esperando. */
const pendientes = new Map<number, { resolver: (jugada: Jugada | null) => void; posicion: Posicion }>();

function obtener(): Worker | null {
  if (fallo) return null;
  if (trabajador) return trabajador;
  try {
    trabajador = new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
    trabajador.onmessage = (evento: MessageEvent<{ id: number; jugada: Jugada | null }>) => {
      pendientes.get(evento.data.id)?.resolver(evento.data.jugada);
      pendientes.delete(evento.data.id);
    };
    trabajador.onerror = () => {
      fallo = true;
      trabajador = null;
      pendientes.forEach(({ resolver, posicion }) => resolver(elegirJugada(posicion)));
      pendientes.clear();
    };
    return trabajador;
  } catch {
    fallo = true;
    return null;
  }
}

/**
 * Copia simple de la posicion: si viene de un ref de Vue es un Proxy, y un
 * Proxy no se puede mandar al Worker (DataCloneError).
 */
function copiaPlana(posicion: Posicion): Posicion {
  return {
    tablero: posicion.tablero.map((pieza) => (pieza ? { tipo: pieza.tipo, color: pieza.color } : null)),
    turno: posicion.turno,
    enroques: { ...posicion.enroques },
    alPaso: posicion.alPaso,
  };
}

export function pensarJugada(posicion: Posicion): Promise<Jugada | null> {
  const plana = copiaPlana(posicion);
  const w = obtener();
  if (!w) return Promise.resolve(elegirJugada(plana));
  const id = ++pedido;
  return new Promise((resolver) => {
    pendientes.set(id, { resolver, posicion: plana });
    try {
      w.postMessage({ id, posicion: plana });
    } catch {
      pendientes.delete(id);
      resolver(elegirJugada(plana));
    }
  });
}
