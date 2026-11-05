/**
 * Que pasa en cada captura del Ajedrez de Preguntas: que tipo de pregunta
 * sale, que se le avisa al estudiante y que significa acertar o fallar.
 *
 * Sin Vue ni red: lo usan Ajedrez.vue y, compilado, el paquete SCORM.
 *
 * | Quien captura          | Modo     | Aviso                            |
 * | pieza del estudiante   | normal   | -                                |
 * | estudiante a rey bot   | rey      | si aciertas, ganas               |
 * | rey del estudiante     | critica  | si fallas, pierdes (con confirmar)|
 * | pieza del bot          | normal   | -                                |
 * | rey del bot            | rey      | si aciertas, ganas               |
 * | bot a rey estudiante   | critica  | si fallas, pierdes               |
 *
 * En todos los casos, si el estudiante acierta, su pieza gana.
 */
import { casillaDelRey, nombreDe, type Jugada, type Posicion, type TipoPieza } from './motor';

export type ModoCaptura = 'normal' | 'rey' | 'critica';

export interface CapturaEnJuego {
  jugada: Jugada;
  deEstudiante: boolean;
  modo: ModoCaptura;
  contexto: string;
  aviso: string | null;
  /** Pregunta critica del propio estudiante: puede elegir otra jugada antes. */
  confirmar: boolean;
}

export const NOMBRE_PIEZA: Record<TipoPieza, string> = {
  p: 'peon', c: 'caballo', a: 'alfil', t: 'torre', d: 'dama', r: 'rey',
};

export function describirCaptura(jugada: Jugada, deEstudiante: boolean): CapturaEnJuego {
  const donde = nombreDe(jugada.casillaCaptura ?? jugada.hasta);
  const atacante = NOMBRE_PIEZA[jugada.pieza];
  const atacada = NOMBRE_PIEZA[jugada.captura ?? 'p'];
  if (deEstudiante) {
    const contexto = `Tu ${atacante} ataca su ${atacada} en ${donde}`;
    if (jugada.pieza === 'r') {
      return { jugada, deEstudiante, modo: 'critica', contexto, confirmar: true,
        aviso: 'Pregunta critica: si fallas, tu rey cae y pierdes la partida.' };
    }
    if (jugada.captura === 'r') {
      return { jugada, deEstudiante, modo: 'rey', contexto, confirmar: false,
        aviso: 'Su rey quedo expuesto: si aciertas, lo capturas y ganas la partida.' };
    }
    return { jugada, deEstudiante, modo: 'normal', contexto, aviso: null, confirmar: false };
  }
  const contexto = `${jugada.pieza === 'r' ? 'El rey' : `Su ${atacante}`} ataca tu ${atacada} en ${donde}`;
  if (jugada.captura === 'r') {
    return { jugada, deEstudiante, modo: 'critica', contexto, confirmar: false,
      aviso: 'Tu rey esta en peligro: si fallas, cae y pierdes la partida.' };
  }
  if (jugada.pieza === 'r') {
    return { jugada, deEstudiante, modo: 'rey', contexto, confirmar: false,
      aviso: 'Pregunta dificil: si aciertas, el rey enemigo cae y ganas la partida.' };
  }
  return { jugada, deEstudiante, modo: 'normal', contexto, aviso: null, confirmar: false };
}

/** Si el estudiante acierta gana su pieza: si atacaba, la captura sale; si defendia, el ataque falla. */
export function capturaExitosa(captura: CapturaEnJuego, correcta: boolean): boolean {
  return captura.deEstudiante ? correcta : !correcta;
}

export function textoResultado(captura: CapturaEnJuego, correcta: boolean): string {
  const j = captura.jugada;
  const atacante = NOMBRE_PIEZA[j.pieza];
  const atacada = NOMBRE_PIEZA[j.captura ?? 'p'];
  if (captura.deEstudiante) {
    if (!correcta && j.pieza === 'r') return 'Incorrecto: tu rey cae y pierdes la partida.';
    if (correcta && j.captura === 'r') return 'Correcto! Capturas su rey: ganaste la partida.';
    return correcta
      ? `Correcto! Tu ${atacante} captura su ${atacada}.`
      : `Incorrecto: pierdes tu ${atacante} y su ${atacada} se queda.`;
  }
  if (correcta && j.pieza === 'r') return 'Correcto! El rey enemigo cae: ganaste la partida.';
  if (!correcta && j.captura === 'r') return 'Incorrecto: tu rey cae y pierdes la partida.';
  return correcta
    ? `Correcto! Tu ${atacada} sobrevive y cae su ${atacante}.`
    : `Incorrecto: pierdes tu ${atacada}.`;
}

/** Si falta un rey la partida ya termino (el estudiante juega con blancas). */
export function finalPorRey(pos: Posicion): 'victoria' | 'derrota' | null {
  if (casillaDelRey(pos, 'b') === null) return 'derrota';
  if (casillaDelRey(pos, 'n') === null) return 'victoria';
  return null;
}
