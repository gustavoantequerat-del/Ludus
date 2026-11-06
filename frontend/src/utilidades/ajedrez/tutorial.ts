/**
 * Mini tutorial del Ajedrez de Preguntas para quien nunca jugo: como se mueve
 * cada pieza, como funcionan las capturas con pregunta, el jaque y las
 * jugadas especiales.
 *
 * Cada paso es un dato (un tablerito con piezas, casillas marcadas y una
 * jugada de muestra) y `svgTutorial` lo dibuja como SVG. Sin Vue: lo usan
 * TutorialAjedrez.vue y, compilado, el paquete SCORM. Cada lado pasa sus
 * nombres de clase (CSS Modules en Ludus, fijos en SCORM) y ahi viven las
 * animaciones.
 */
import { figura } from './figuras';
import type { Color, TipoPieza } from './motor';

/** [columna, fila] dentro del tablerito; la fila 0 es la de arriba. */
type Punto = [number, number];

interface PiezaTutorial {
  tipo: TipoPieza;
  color: Color;
  en: Punto;
}

export interface PasoTutorial {
  titulo: string;
  /** Parrafos cortos. */
  texto: string[];
  columnas: number;
  filas: number;
  piezas: PiezaTutorial[];
  /** Casillas a las que puede ir (punto). */
  destinos?: Punto[];
  /** Casillas donde puede capturar (anillo). */
  capturas?: Punto[];
  /** Casillas a las que el rey no puede ir (cruz). */
  prohibidas?: Punto[];
  /** Casillas resaltadas (la ultima jugada del rival, por ejemplo). */
  resaltadas?: Punto[];
  /** Rey en jaque (casilla que late en rojo). */
  jaque?: Punto;
  /** Un "?" sobre la casilla: ahi sale la pregunta. */
  pregunta?: Punto;
  /** Jugadas de muestra que se repiten (la pieza se desliza). */
  movimientos?: { desde: Punto; hasta: Punto }[];
  /** La pieza en la que se convierte al llegar (coronacion). */
  corona?: { tipo: TipoPieza; en: Punto };
  /** Escribe el nombre de cada pieza debajo de su casilla. */
  nombres?: boolean;
}

export interface ClasesTutorial {
  svg: string;
  clara: string;
  oscura: string;
  resaltada: string;
  destino: string;
  captura: string;
  prohibida: string;
  jaque: string;
  pregunta: string;
  preguntaTexto: string;
  pieza: string;
  blanca: string;
  negra: string;
  detalle: string;
  ojo: string;
  origen: string;
  fantasma: string;
  corona: string;
  nombre: string;
}

const NOMBRES: Record<TipoPieza, string> = {
  p: 'Peon', c: 'Caballo', a: 'Alfil', t: 'Torre', d: 'Dama', r: 'Rey',
};

/** Todas las casillas en linea desde `en` hacia cada direccion, dentro del tablerito. */
function rayos(en: Punto, direcciones: Punto[], columnas: number, filas: number, bloqueos: Punto[] = []): Punto[] {
  const ocupada = (c: number, f: number) => bloqueos.some(([bc, bf]) => bc === c && bf === f);
  const salida: Punto[] = [];
  for (const [dc, df] of direcciones) {
    let c = en[0] + dc;
    let f = en[1] + df;
    while (c >= 0 && f >= 0 && c < columnas && f < filas && !ocupada(c, f)) {
      salida.push([c, f]);
      c += dc;
      f += df;
    }
  }
  return salida;
}

const RECTAS: Punto[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIAGONALES: Punto[] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

export const PASOS_TUTORIAL: PasoTutorial[] = [
  {
    titulo: 'Tus piezas',
    texto: [
      'Juegas con las blancas contra el bot y mueves primero. En cada turno mueves una sola pieza.',
      'Ganas si le das jaque mate al rey del bot: lo atrapas de forma que no pueda escapar.',
      'Para mover, toca una pieza tuya: se marcan las casillas a las que puede ir. Despues toca una de esas casillas.',
    ],
    columnas: 6,
    filas: 1,
    nombres: true,
    piezas: [
      { tipo: 'p', color: 'b', en: [0, 0] },
      { tipo: 'c', color: 'b', en: [1, 0] },
      { tipo: 'a', color: 'b', en: [2, 0] },
      { tipo: 't', color: 'b', en: [3, 0] },
      { tipo: 'd', color: 'b', en: [4, 0] },
      { tipo: 'r', color: 'b', en: [5, 0] },
    ],
  },
  {
    titulo: 'El peon',
    texto: [
      'Avanza recto hacia adelante, una casilla. En su primera jugada puede avanzar dos.',
      'Captura de otra forma: en diagonal, una casilla hacia adelante. Nunca retrocede.',
    ],
    columnas: 5,
    filas: 5,
    piezas: [
      { tipo: 'p', color: 'b', en: [2, 3] },
      { tipo: 'c', color: 'n', en: [3, 2] },
    ],
    destinos: [[2, 2], [2, 1]],
    capturas: [[3, 2]],
    movimientos: [{ desde: [2, 3], hasta: [2, 1] }],
  },
  {
    titulo: 'El caballo',
    texto: [
      'Se mueve en forma de L: dos casillas en una direccion y una hacia el costado.',
      'Es la unica pieza que salta por encima de las demas.',
    ],
    columnas: 5,
    filas: 5,
    piezas: [
      { tipo: 'c', color: 'b', en: [2, 2] },
      { tipo: 'p', color: 'b', en: [2, 1] },
      { tipo: 'p', color: 'b', en: [3, 2] },
      { tipo: 'a', color: 'n', en: [3, 0] },
    ],
    destinos: [[1, 0], [0, 1], [4, 1], [0, 3], [4, 3], [1, 4], [3, 4]],
    capturas: [[3, 0]],
    movimientos: [{ desde: [2, 2], hasta: [1, 0] }],
  },
  {
    titulo: 'El alfil',
    texto: [
      'Se mueve en diagonal, todas las casillas que quiera mientras no haya piezas en el camino.',
      'Siempre se queda en casillas del mismo color.',
    ],
    columnas: 5,
    filas: 5,
    piezas: [
      { tipo: 'a', color: 'b', en: [2, 2] },
      { tipo: 't', color: 'n', en: [4, 0] },
    ],
    destinos: rayos([2, 2], DIAGONALES, 5, 5, [[4, 0]]),
    capturas: [[4, 0]],
    movimientos: [{ desde: [2, 2], hasta: [0, 4] }],
  },
  {
    titulo: 'La torre',
    texto: ['Se mueve en linea recta: adelante, atras y a los costados, todas las casillas libres.'],
    columnas: 5,
    filas: 5,
    piezas: [
      { tipo: 't', color: 'b', en: [2, 2] },
      { tipo: 'c', color: 'n', en: [2, 0] },
    ],
    destinos: rayos([2, 2], RECTAS, 5, 5, [[2, 0]]),
    capturas: [[2, 0]],
    movimientos: [{ desde: [2, 2], hasta: [4, 2] }],
  },
  {
    titulo: 'La dama',
    texto: [
      'Es la torre y el alfil juntos: en linea recta y en diagonal, todas las casillas libres.',
      'Es tu pieza mas poderosa: cuidala.',
    ],
    columnas: 5,
    filas: 5,
    piezas: [{ tipo: 'd', color: 'b', en: [2, 2] }],
    destinos: rayos([2, 2], [...RECTAS, ...DIAGONALES], 5, 5),
    movimientos: [{ desde: [2, 2], hasta: [0, 0] }],
  },
  {
    titulo: 'El rey',
    texto: [
      'Se mueve una casilla en cualquier direccion.',
      'Nunca puede ir a una casilla atacada por el rival: aqui la torre negra ataca toda la fila de arriba.',
    ],
    columnas: 5,
    filas: 5,
    piezas: [
      { tipo: 'r', color: 'b', en: [2, 2] },
      { tipo: 't', color: 'n', en: [4, 1] },
    ],
    destinos: [[1, 2], [3, 2], [1, 3], [2, 3], [3, 3]],
    prohibidas: [[1, 1], [2, 1], [3, 1]],
    movimientos: [{ desde: [2, 2], hasta: [2, 3] }],
  },
  {
    titulo: 'Capturar con una pregunta',
    texto: [
      'Capturas moviendo tu pieza a la casilla de una pieza rival. En este juego, antes sale una pregunta.',
      'Si aciertas, capturas. Si fallas, la que cae es tu pieza.',
      'Cuando el bot te ataca tambien sale una pregunta: si aciertas, tu pieza se salva.',
    ],
    columnas: 5,
    filas: 4,
    piezas: [
      { tipo: 'c', color: 'b', en: [1, 3] },
      { tipo: 'a', color: 'n', en: [2, 1] },
    ],
    capturas: [[2, 1]],
    pregunta: [2, 1],
    movimientos: [{ desde: [1, 3], hasta: [2, 1] }],
  },
  {
    titulo: 'Jaque y jaque mate',
    texto: [
      'Jaque es atacar al rey. Quien esta en jaque tiene que salvar a su rey en esa misma jugada.',
      'Jaque mate es cuando no hay forma de salvarlo: la partida termina. Aqui la torre da mate porque los peones negros encierran a su rey.',
      'Si tu rey esta en jaque, solo te deja hacer jugadas que lo saquen del jaque.',
    ],
    columnas: 5,
    filas: 3,
    piezas: [
      { tipo: 't', color: 'b', en: [0, 2] },
      { tipo: 'r', color: 'n', en: [3, 0] },
      { tipo: 'p', color: 'n', en: [2, 1] },
      { tipo: 'p', color: 'n', en: [3, 1] },
      { tipo: 'p', color: 'n', en: [4, 1] },
    ],
    jaque: [3, 0],
    movimientos: [{ desde: [0, 2], hasta: [0, 0] }],
  },
  {
    titulo: 'Enroque',
    texto: [
      'Una vez por partida, el rey avanza dos casillas hacia una torre y esa torre salta al otro lado del rey.',
      'Se puede si ni el rey ni esa torre se movieron, no hay piezas en medio y el rey no esta en jaque ni pasa por casillas atacadas.',
      'Para hacerlo, toca tu rey y despues la casilla que esta a dos pasos.',
    ],
    columnas: 8,
    filas: 2,
    piezas: [
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((c): PiezaTutorial => ({ tipo: 'p', color: 'b', en: [c, 0] })),
      { tipo: 't', color: 'b', en: [0, 1] },
      { tipo: 'r', color: 'b', en: [4, 1] },
      { tipo: 't', color: 'b', en: [7, 1] },
    ],
    destinos: [[6, 1], [2, 1]],
    movimientos: [
      { desde: [4, 1], hasta: [6, 1] },
      { desde: [7, 1], hasta: [5, 1] },
    ],
  },
  {
    titulo: 'Coronacion',
    texto: [
      'Si un peon tuyo llega hasta la ultima fila, se convierte en dama.',
      'Por eso conviene empujar los peones que tienen el camino libre.',
    ],
    columnas: 5,
    filas: 3,
    piezas: [{ tipo: 'p', color: 'b', en: [2, 1] }],
    destinos: [[2, 0]],
    movimientos: [{ desde: [2, 1], hasta: [2, 0] }],
    corona: { tipo: 'd', en: [2, 0] },
  },
  {
    titulo: 'Captura al paso',
    texto: [
      'Si un peon rival avanza dos casillas y queda justo al lado de tu peon, en tu jugada siguiente puedes capturarlo como si hubiera avanzado una sola.',
      'Tu peon va a la casilla que el otro salto. Tambien sale una pregunta.',
    ],
    columnas: 5,
    filas: 4,
    piezas: [
      { tipo: 'p', color: 'b', en: [2, 2] },
      { tipo: 'p', color: 'n', en: [3, 2] },
    ],
    resaltadas: [[3, 0], [3, 2]],
    destinos: [[2, 1]],
    capturas: [[3, 1]],
    movimientos: [{ desde: [2, 2], hasta: [3, 1] }],
  },
];

const LADO = 40;
const ALTO_NOMBRE = 18;

/** El paso dibujado como SVG (markup propio, sin datos del usuario). */
export function svgTutorial(paso: PasoTutorial, clases: ClasesTutorial): string {
  const ancho = paso.columnas * LADO;
  const alto = paso.filas * LADO + (paso.nombres ? ALTO_NOMBRE : 0);
  const x = (p: Punto) => p[0] * LADO;
  const y = (p: Punto) => p[1] * LADO;
  const centro = (p: Punto) => `cx="${x(p) + LADO / 2}" cy="${y(p) + LADO / 2}"`;
  const partes: string[] = [];

  for (let f = 0; f < paso.filas; f++) {
    for (let c = 0; c < paso.columnas; c++) {
      const clase = (c + f) % 2 === 0 ? clases.clara : clases.oscura;
      partes.push(`<rect class="${clase}" x="${c * LADO}" y="${f * LADO}" width="${LADO}" height="${LADO}"/>`);
    }
  }
  for (const p of paso.resaltadas ?? []) {
    partes.push(`<rect class="${clases.resaltada}" x="${x(p)}" y="${y(p)}" width="${LADO}" height="${LADO}"/>`);
  }
  if (paso.jaque) {
    partes.push(`<rect class="${clases.jaque}" x="${x(paso.jaque)}" y="${y(paso.jaque)}" width="${LADO}" height="${LADO}"/>`);
  }

  // Las piezas que se mueven en la muestra: quedan tenues en su casilla y una copia se desliza.
  const moviles = new Set((paso.movimientos ?? []).map((m) => m.desde.join()));
  const dibujarPieza = (tipo: TipoPieza, color: Color, p: Punto, extra = '') =>
    `<svg class="${clases.pieza} ${color === 'b' ? clases.blanca : clases.negra} ${extra}" x="${x(p) + 3}" y="${y(p) + 3}" width="${LADO - 6}" height="${LADO - 6}" viewBox="0 0 45 45">` +
    figura(tipo, { detalle: clases.detalle, ojo: clases.ojo }) +
    '</svg>';

  for (const pieza of paso.piezas) {
    const seMueve = moviles.has(pieza.en.join());
    partes.push(dibujarPieza(pieza.tipo, pieza.color, pieza.en, seMueve ? clases.origen : ''));
  }

  (paso.destinos ?? []).forEach((p, i) => {
    partes.push(`<circle class="${clases.destino}" style="--i:${i}" ${centro(p)} r="6"/>`);
  });
  (paso.capturas ?? []).forEach((p, i) => {
    partes.push(`<circle class="${clases.captura}" style="--i:${i}" ${centro(p)} r="17"/>`);
  });
  for (const p of paso.prohibidas ?? []) {
    const a = x(p) + 13;
    const b = y(p) + 13;
    partes.push(`<path class="${clases.prohibida}" d="M${a} ${b} l14 14 M${a + 14} ${b} l-14 14"/>`);
  }

  for (const { desde, hasta } of paso.movimientos ?? []) {
    const pieza = paso.piezas.find((pz) => pz.en[0] === desde[0] && pz.en[1] === desde[1]);
    if (!pieza) continue;
    const dx = (hasta[0] - desde[0]) * LADO;
    const dy = (hasta[1] - desde[1]) * LADO;
    partes.push(`<g class="${clases.fantasma}" style="--dx:${dx}px;--dy:${dy}px">${dibujarPieza(pieza.tipo, pieza.color, desde)}</g>`);
  }
  if (paso.corona) {
    partes.push(`<g class="${clases.corona}">${dibujarPieza(paso.corona.tipo, 'b', paso.corona.en)}</g>`);
  }
  if (paso.pregunta) {
    const cx = x(paso.pregunta) + LADO - 6;
    const cy = y(paso.pregunta) + 6;
    partes.push(
      `<g class="${clases.pregunta}"><circle cx="${cx}" cy="${cy}" r="9"/>` +
        `<text class="${clases.preguntaTexto}" x="${cx}" y="${cy + 4}" text-anchor="middle">?</text></g>`,
    );
  }
  if (paso.nombres) {
    for (const pieza of paso.piezas) {
      partes.push(
        `<text class="${clases.nombre}" x="${x(pieza.en) + LADO / 2}" y="${paso.filas * LADO + 13}" text-anchor="middle">${NOMBRES[pieza.tipo]}</text>`,
      );
    }
  }

  return `<svg class="${clases.svg}" viewBox="0 0 ${ancho} ${alto}" role="img" aria-hidden="true">${partes.join('')}</svg>`;
}
