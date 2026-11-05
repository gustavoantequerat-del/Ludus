/* Generado desde frontend/src/utilidades/ajedrez (npm run ajedrez:scorm). No editar a mano. */
"use strict";
(() => {
  var __defProp = Object.defineProperty, __defProps = Object.defineProperties;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty, __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: !0, configurable: !0, writable: !0, value }) : obj[key] = value, __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      __hasOwnProp.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b))
        __propIsEnum.call(b, prop) && __defNormalProp(a, prop, b[prop]);
    return a;
  }, __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: !0 });
  };

  // src/utilidades/ajedrez/motor.ts
  var motor_exports = {};
  __export(motor_exports, {
    aplicar: () => aplicar,
    casillaAtacada: () => casillaAtacada,
    casillaDe: () => casillaDe,
    casillaDelRey: () => casillaDelRey,
    columna: () => columna,
    contrario: () => contrario,
    desdeFen: () => desdeFen,
    enJaque: () => enJaque,
    fila: () => fila,
    finalDe: () => finalDe,
    jugadasDesde: () => jugadasDesde,
    jugadasLegales: () => jugadasLegales,
    jugadasPosibles: () => jugadasPosibles,
    nombreDe: () => nombreDe,
    notacion: () => notacion,
    perft: () => perft,
    posicionInicial: () => posicionInicial
  });
  var contrario = (color) => color === "b" ? "n" : "b", fila = (c) => Math.floor(c / 8), columna = (c) => c % 8, LETRAS = "abcdefgh";
  function casillaDe(nombre) {
    return (8 - Number(nombre[1])) * 8 + LETRAS.indexOf(nombre[0]);
  }
  function nombreDe(c) {
    return LETRAS[columna(c)] + (8 - fila(c));
  }
  var FILA_INICIAL = ["t", "c", "a", "d", "r", "a", "c", "t"];
  function posicionInicial() {
    let tablero = new Array(64).fill(null);
    for (let col = 0; col < 8; col++)
      tablero[col] = { tipo: FILA_INICIAL[col], color: "n" }, tablero[8 + col] = { tipo: "p", color: "n" }, tablero[48 + col] = { tipo: "p", color: "b" }, tablero[56 + col] = { tipo: FILA_INICIAL[col], color: "b" };
    return {
      tablero,
      turno: "b",
      enroques: { blancasCorto: !0, blancasLargo: !0, negrasCorto: !0, negrasLargo: !0 },
      alPaso: null
    };
  }
  function desdeFen(fen) {
    let [filas, turno, enroques2, alPaso] = fen.trim().split(/\s+/), letras = { p: "p", n: "c", b: "a", r: "t", q: "d", k: "r" }, tablero = [];
    for (let caracter of filas.replace(/\//g, ""))
      if (/\d/.test(caracter))
        for (let i = 0; i < Number(caracter); i++) tablero.push(null);
      else {
        let minuscula = caracter.toLowerCase();
        tablero.push({ tipo: letras[minuscula], color: caracter === minuscula ? "n" : "b" });
      }
    return {
      tablero,
      turno: turno === "b" ? "n" : "b",
      enroques: {
        blancasCorto: enroques2.includes("K"),
        blancasLargo: enroques2.includes("Q"),
        negrasCorto: enroques2.includes("k"),
        negrasLargo: enroques2.includes("q")
      },
      alPaso: alPaso && alPaso !== "-" ? casillaDe(alPaso) : null
    };
  }
  var SALTOS_CABALLO = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1]
  ], PASOS_REY = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1]
  ], DIAGONALES = [[-1, -1], [-1, 1], [1, -1], [1, 1]], RECTAS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  function dentro(f, c) {
    return f >= 0 && f < 8 && c >= 0 && c < 8;
  }
  function casillaAtacada(pos, casilla, porColor) {
    let t = pos.tablero, f = fila(casilla), c = columna(casilla), filaPeon = porColor === "b" ? f + 1 : f - 1;
    for (let dc of [-1, 1])
      if (dentro(filaPeon, c + dc)) {
        let p = t[filaPeon * 8 + c + dc];
        if (p && p.color === porColor && p.tipo === "p") return !0;
      }
    for (let [df, dc] of SALTOS_CABALLO)
      if (dentro(f + df, c + dc)) {
        let p = t[(f + df) * 8 + c + dc];
        if (p && p.color === porColor && p.tipo === "c") return !0;
      }
    for (let [df, dc] of PASOS_REY)
      if (dentro(f + df, c + dc)) {
        let p = t[(f + df) * 8 + c + dc];
        if (p && p.color === porColor && p.tipo === "r") return !0;
      }
    let deslizar = (direcciones, tipos) => {
      for (let [df, dc] of direcciones) {
        let nf = f + df, nc = c + dc;
        for (; dentro(nf, nc); ) {
          let p = t[nf * 8 + nc];
          if (p) {
            if (p.color === porColor && tipos.includes(p.tipo)) return !0;
            break;
          }
          nf += df, nc += dc;
        }
      }
      return !1;
    };
    return deslizar(DIAGONALES, ["a", "d"]) || deslizar(RECTAS, ["t", "d"]);
  }
  function casillaDelRey(pos, color) {
    let indice = pos.tablero.findIndex((p) => p !== null && p.tipo === "r" && p.color === color);
    return indice >= 0 ? indice : null;
  }
  function enJaque(pos, color) {
    let rey = casillaDelRey(pos, color);
    return rey !== null && casillaAtacada(pos, rey, contrario(color));
  }
  function nueva(desde, hasta, pieza, captura, extra = {}) {
    return __spreadValues({
      desde,
      hasta,
      pieza,
      captura,
      casillaCaptura: captura ? hasta : null,
      promocion: null,
      enroque: null
    }, extra);
  }
  function jugadasPosibles(pos) {
    let jugadas = [], t = pos.tablero, yo = pos.turno, agregar = (desde, hasta, tipo) => {
      let destino = t[hasta];
      return destino && destino.color === yo ? !1 : (jugadas.push(nueva(desde, hasta, tipo, destino ? destino.tipo : null)), !destino);
    };
    for (let desde = 0; desde < 64; desde++) {
      let pieza = t[desde];
      if (!pieza || pieza.color !== yo) continue;
      let f = fila(desde), c = columna(desde);
      if (pieza.tipo === "p") {
        let avance = yo === "b" ? -1 : 1, inicio = yo === "b" ? 6 : 1, ultima = yo === "b" ? 0 : 7, nf = f + avance;
        if (!dentro(nf, c)) continue;
        let corona = nf === ultima, uno = nf * 8 + c;
        if (!t[uno]) {
          jugadas.push(nueva(desde, uno, "p", null, { promocion: corona ? "d" : null }));
          let dos = (f + 2 * avance) * 8 + c;
          f === inicio && !t[dos] && jugadas.push(nueva(desde, dos, "p", null));
        }
        for (let dc of [-1, 1]) {
          if (!dentro(nf, c + dc)) continue;
          let hasta = nf * 8 + c + dc, destino = t[hasta];
          if (destino && destino.color !== yo)
            jugadas.push(nueva(desde, hasta, "p", destino.tipo, { promocion: corona ? "d" : null }));
          else if (hasta === pos.alPaso) {
            let capturada = f * 8 + c + dc, victima = t[capturada];
            victima && victima.tipo === "p" && victima.color !== yo && jugadas.push(nueva(desde, hasta, "p", "p", { casillaCaptura: capturada }));
          }
        }
        continue;
      }
      if (pieza.tipo === "c" || pieza.tipo === "r") {
        let saltos = pieza.tipo === "c" ? SALTOS_CABALLO : PASOS_REY;
        for (let [df, dc] of saltos)
          dentro(f + df, c + dc) && agregar(desde, (f + df) * 8 + c + dc, pieza.tipo);
        pieza.tipo === "r" && jugadas.push(...enroques(pos, desde));
        continue;
      }
      let direcciones = pieza.tipo === "a" ? DIAGONALES : pieza.tipo === "t" ? RECTAS : [...DIAGONALES, ...RECTAS];
      for (let [df, dc] of direcciones) {
        let nf = f + df, nc = c + dc;
        for (; dentro(nf, nc) && agregar(desde, nf * 8 + nc, pieza.tipo); )
          nf += df, nc += dc;
      }
    }
    return jugadas;
  }
  function enroques(pos, desde) {
    let yo = pos.turno, filaRey = yo === "b" ? 7 : 0;
    if (desde !== filaRey * 8 + 4) return [];
    let rival = contrario(yo);
    if (casillaAtacada(pos, desde, rival)) return [];
    let t = pos.tablero, resultado = [], torre = (col) => {
      let p = t[filaRey * 8 + col];
      return p !== null && p.tipo === "t" && p.color === yo;
    }, libres = (cols) => cols.every((col) => !t[filaRey * 8 + col]), seguras = (cols) => cols.every((col) => !casillaAtacada(pos, filaRey * 8 + col, rival)), corto = yo === "b" ? pos.enroques.blancasCorto : pos.enroques.negrasCorto, largo = yo === "b" ? pos.enroques.blancasLargo : pos.enroques.negrasLargo;
    return corto && torre(7) && libres([5, 6]) && seguras([5, 6]) && resultado.push(nueva(desde, filaRey * 8 + 6, "r", null, { enroque: "corto" })), largo && torre(0) && libres([1, 2, 3]) && seguras([2, 3]) && resultado.push(nueva(desde, filaRey * 8 + 2, "r", null, { enroque: "largo" })), resultado;
  }
  function aplicar(pos, jugada, capturaExitosa2 = !0) {
    let tablero = pos.tablero.slice(), enroquesNuevos = __spreadValues({}, pos.enroques), pieza = tablero[jugada.desde], fracaso = jugada.captura !== null && !capturaExitosa2;
    if (tablero[jugada.desde] = null, !fracaso && (jugada.casillaCaptura !== null && (tablero[jugada.casillaCaptura] = null), tablero[jugada.hasta] = jugada.promocion ? { tipo: jugada.promocion, color: pieza.color } : pieza, jugada.enroque)) {
      let filaRey = fila(jugada.desde), [origen, destino] = jugada.enroque === "corto" ? [7, 5] : [0, 3];
      tablero[filaRey * 8 + destino] = tablero[filaRey * 8 + origen], tablero[filaRey * 8 + origen] = null;
    }
    let tocar = (casilla) => {
      casilla === 60 && (enroquesNuevos.blancasCorto = !1, enroquesNuevos.blancasLargo = !1), casilla === 4 && (enroquesNuevos.negrasCorto = !1, enroquesNuevos.negrasLargo = !1), casilla === 63 && (enroquesNuevos.blancasCorto = !1), casilla === 56 && (enroquesNuevos.blancasLargo = !1), casilla === 7 && (enroquesNuevos.negrasCorto = !1), casilla === 0 && (enroquesNuevos.negrasLargo = !1);
    };
    tocar(jugada.desde), fracaso || tocar(jugada.hasta);
    let doble = pieza.tipo === "p" && Math.abs(jugada.hasta - jugada.desde) === 16;
    return {
      tablero,
      turno: contrario(pos.turno),
      enroques: enroquesNuevos,
      alPaso: doble && !fracaso ? (jugada.desde + jugada.hasta) / 2 : null
    };
  }
  function jugadasLegales(pos) {
    let yo = pos.turno;
    return jugadasPosibles(pos).filter((jugada) => !enJaque(aplicar(pos, jugada), yo));
  }
  function jugadasDesde(pos, desde) {
    return jugadasLegales(pos).filter((j) => j.desde === desde);
  }
  function materialInsuficiente(pos) {
    let resto = pos.tablero.filter((p) => p !== null && p.tipo !== "r");
    return resto.length === 0 ? !0 : resto.length === 1 && (resto[0].tipo === "a" || resto[0].tipo === "c");
  }
  function finalDe(pos) {
    return jugadasLegales(pos).length === 0 ? enJaque(pos, pos.turno) ? "mate" : "ahogado" : materialInsuficiente(pos) ? "material" : null;
  }
  function notacion(jugada) {
    if (jugada.enroque) return jugada.enroque === "corto" ? "O-O" : "O-O-O";
    let letra = { p: "", c: "C", a: "A", t: "T", d: "D", r: "R" }, separador = jugada.captura ? "x" : "-", coronacion = jugada.promocion ? "=D" : "";
    return `${letra[jugada.pieza]}${nombreDe(jugada.desde)}${separador}${nombreDe(jugada.hasta)}${coronacion}`;
  }
  function perft(pos, profundidad) {
    if (profundidad === 0) return 1;
    let total = 0;
    for (let jugada of jugadasLegales(pos)) total += perft(aplicar(pos, jugada), profundidad - 1);
    return total;
  }

  // src/utilidades/ajedrez/bot.ts
  var PROFUNDIDAD_INTERMEDIA = 3, TIEMPO_MAXIMO_MS = 900, MARGEN_AZAR = 20, MATE = 1e5, VALOR = { p: 100, c: 320, a: 330, t: 500, d: 900, r: 0 }, TABLAS = {
    p: [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      50,
      50,
      50,
      50,
      50,
      50,
      50,
      50,
      10,
      10,
      20,
      30,
      30,
      20,
      10,
      10,
      5,
      5,
      10,
      25,
      25,
      10,
      5,
      5,
      0,
      0,
      0,
      20,
      20,
      0,
      0,
      0,
      5,
      -5,
      -10,
      0,
      0,
      -10,
      -5,
      5,
      5,
      10,
      10,
      -20,
      -20,
      10,
      10,
      5,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    c: [
      -50,
      -40,
      -30,
      -30,
      -30,
      -30,
      -40,
      -50,
      -40,
      -20,
      0,
      0,
      0,
      0,
      -20,
      -40,
      -30,
      0,
      10,
      15,
      15,
      10,
      0,
      -30,
      -30,
      5,
      15,
      20,
      20,
      15,
      5,
      -30,
      -30,
      0,
      15,
      20,
      20,
      15,
      0,
      -30,
      -30,
      5,
      10,
      15,
      15,
      10,
      5,
      -30,
      -40,
      -20,
      0,
      5,
      5,
      0,
      -20,
      -40,
      -50,
      -40,
      -30,
      -30,
      -30,
      -30,
      -40,
      -50
    ],
    a: [
      -20,
      -10,
      -10,
      -10,
      -10,
      -10,
      -10,
      -20,
      -10,
      0,
      0,
      0,
      0,
      0,
      0,
      -10,
      -10,
      0,
      5,
      10,
      10,
      5,
      0,
      -10,
      -10,
      5,
      5,
      10,
      10,
      5,
      5,
      -10,
      -10,
      0,
      10,
      10,
      10,
      10,
      0,
      -10,
      -10,
      10,
      10,
      10,
      10,
      10,
      10,
      -10,
      -10,
      5,
      0,
      0,
      0,
      0,
      5,
      -10,
      -20,
      -10,
      -10,
      -10,
      -10,
      -10,
      -10,
      -20
    ],
    t: [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      5,
      10,
      10,
      10,
      10,
      10,
      10,
      5,
      -5,
      0,
      0,
      0,
      0,
      0,
      0,
      -5,
      -5,
      0,
      0,
      0,
      0,
      0,
      0,
      -5,
      -5,
      0,
      0,
      0,
      0,
      0,
      0,
      -5,
      -5,
      0,
      0,
      0,
      0,
      0,
      0,
      -5,
      -5,
      0,
      0,
      0,
      0,
      0,
      0,
      -5,
      0,
      0,
      0,
      5,
      5,
      0,
      0,
      0
    ],
    d: [
      -20,
      -10,
      -10,
      -5,
      -5,
      -10,
      -10,
      -20,
      -10,
      0,
      0,
      0,
      0,
      0,
      0,
      -10,
      -10,
      0,
      5,
      5,
      5,
      5,
      0,
      -10,
      -5,
      0,
      5,
      5,
      5,
      5,
      0,
      -5,
      0,
      0,
      5,
      5,
      5,
      5,
      0,
      -5,
      -10,
      5,
      5,
      5,
      5,
      5,
      0,
      -10,
      -10,
      0,
      5,
      0,
      0,
      0,
      0,
      -10,
      -20,
      -10,
      -10,
      -5,
      -5,
      -10,
      -10,
      -20
    ],
    r: [
      -30,
      -40,
      -40,
      -50,
      -50,
      -40,
      -40,
      -30,
      -30,
      -40,
      -40,
      -50,
      -50,
      -40,
      -40,
      -30,
      -30,
      -40,
      -40,
      -50,
      -50,
      -40,
      -40,
      -30,
      -30,
      -40,
      -40,
      -50,
      -50,
      -40,
      -40,
      -30,
      -20,
      -30,
      -30,
      -40,
      -40,
      -30,
      -30,
      -20,
      -10,
      -20,
      -20,
      -20,
      -20,
      -20,
      -20,
      -10,
      20,
      20,
      0,
      0,
      0,
      0,
      20,
      20,
      20,
      30,
      10,
      0,
      0,
      10,
      30,
      20
    ]
  };
  function valorPieza(pieza, casilla) {
    let indice = pieza.color === "b" ? casilla : (7 - Math.floor(casilla / 8)) * 8 + casilla % 8;
    return VALOR[pieza.tipo] + TABLAS[pieza.tipo][indice];
  }
  function evaluar(pos, color) {
    let total = 0;
    return pos.tablero.forEach((pieza, casilla) => {
      if (!pieza) return;
      let valor = valorPieza(pieza, casilla);
      total += pieza.color === color ? valor : -valor;
    }), total;
  }
  function ordenar(jugadas) {
    let puntaje = (j) => (j.captura ? j.captura === "r" ? 1e5 : 10 * VALOR[j.captura] - VALOR[j.pieza] : 0) + (j.promocion ? 800 : 0);
    return jugadas.sort((x, y) => puntaje(y) - puntaje(x));
  }
  function buscar(pos, profundidad, alfa, beta, ply) {
    if (casillaDelRey(pos, pos.turno) === null) return -MATE + ply;
    let jugadas = jugadasPosibles(pos);
    if (jugadas.some((j) => j.captura === "r")) return MATE - ply;
    if (profundidad === 0) return evaluar(pos, pos.turno);
    let ilegal = -(MATE - ply - 1), mejor = -1 / 0, legales = 0;
    for (let jugada of ordenar(jugadas)) {
      let valor = -buscar(aplicar(pos, jugada), profundidad - 1, -beta, -alfa, ply + 1);
      if (valor !== ilegal && (legales++, valor > mejor && (mejor = valor), valor > alfa && (alfa = valor), alfa >= beta))
        break;
    }
    return legales === 0 ? enJaque(pos, pos.turno) ? -MATE + ply : 0 : mejor;
  }
  function valorar(pos, jugadas, profundidad) {
    return jugadas.map((jugada) => ({
      jugada,
      // Ventana completa en la raiz: se necesita el valor real de cada jugada
      // para elegir al azar entre las mejores.
      valor: -buscar(aplicar(pos, jugada), profundidad - 1, -1 / 0, 1 / 0, 1)
    }));
  }
  function elegirJugada(pos, profundidad = PROFUNDIDAD_INTERMEDIA, tiempoMaximoMs = TIEMPO_MAXIMO_MS) {
    let jugadas = ordenar(jugadasLegales(pos));
    if (jugadas.length === 0) return null;
    let alRey = jugadas.find((j) => j.captura === "r");
    if (alRey) return alRey;
    let inicio = Date.now(), valoradas = valorar(pos, jugadas, 1);
    for (let p = 2; p <= profundidad && !((Date.now() - inicio) * 8 > tiempoMaximoMs); p++)
      valoradas = valorar(pos, jugadas, p);
    let mejor = Math.max(...valoradas.map((v) => v.valor)), candidatas = valoradas.filter((v) => v.valor >= mejor - MARGEN_AZAR);
    return candidatas[Math.floor(Math.random() * candidatas.length)].jugada;
  }

  // src/utilidades/ajedrez/capturas.ts
  var capturas_exports = {};
  __export(capturas_exports, {
    NOMBRE_PIEZA: () => NOMBRE_PIEZA,
    capturaExitosa: () => capturaExitosa,
    describirCaptura: () => describirCaptura,
    finalPorRey: () => finalPorRey,
    textoResultado: () => textoResultado
  });
  var NOMBRE_PIEZA = {
    p: "peon",
    c: "caballo",
    a: "alfil",
    t: "torre",
    d: "dama",
    r: "rey"
  };
  function describirCaptura(jugada, deEstudiante) {
    var _a, _b;
    let donde = nombreDe((_a = jugada.casillaCaptura) != null ? _a : jugada.hasta), atacante = NOMBRE_PIEZA[jugada.pieza], atacada = NOMBRE_PIEZA[(_b = jugada.captura) != null ? _b : "p"];
    if (deEstudiante) {
      let contexto2 = `Tu ${atacante} ataca su ${atacada} en ${donde}`;
      return jugada.pieza === "r" ? {
        jugada,
        deEstudiante,
        modo: "critica",
        contexto: contexto2,
        confirmar: !0,
        aviso: "Pregunta critica: si fallas, tu rey cae y pierdes la partida."
      } : jugada.captura === "r" ? {
        jugada,
        deEstudiante,
        modo: "rey",
        contexto: contexto2,
        confirmar: !1,
        aviso: "Su rey quedo expuesto: si aciertas, lo capturas y ganas la partida."
      } : { jugada, deEstudiante, modo: "normal", contexto: contexto2, aviso: null, confirmar: !1 };
    }
    let contexto = `${jugada.pieza === "r" ? "El rey" : `Su ${atacante}`} ataca tu ${atacada} en ${donde}`;
    return jugada.captura === "r" ? {
      jugada,
      deEstudiante,
      modo: "critica",
      contexto,
      confirmar: !1,
      aviso: "Tu rey esta en peligro: si fallas, cae y pierdes la partida."
    } : jugada.pieza === "r" ? {
      jugada,
      deEstudiante,
      modo: "rey",
      contexto,
      confirmar: !1,
      aviso: "Pregunta dificil: si aciertas, el rey enemigo cae y ganas la partida."
    } : { jugada, deEstudiante, modo: "normal", contexto, aviso: null, confirmar: !1 };
  }
  function capturaExitosa(captura, correcta) {
    return captura.deEstudiante ? correcta : !correcta;
  }
  function textoResultado(captura, correcta) {
    var _a;
    let j = captura.jugada, atacante = NOMBRE_PIEZA[j.pieza], atacada = NOMBRE_PIEZA[(_a = j.captura) != null ? _a : "p"];
    return captura.deEstudiante ? !correcta && j.pieza === "r" ? "Incorrecto: tu rey cae y pierdes la partida." : correcta && j.captura === "r" ? "Correcto! Capturas su rey: ganaste la partida." : correcta ? `Correcto! Tu ${atacante} captura su ${atacada}.` : `Incorrecto: pierdes tu ${atacante} y su ${atacada} se queda.` : correcta && j.pieza === "r" ? "Correcto! El rey enemigo cae: ganaste la partida." : !correcta && j.captura === "r" ? "Incorrecto: tu rey cae y pierdes la partida." : correcta ? `Correcto! Tu ${atacada} sobrevive y cae su ${atacante}.` : `Incorrecto: pierdes tu ${atacada}.`;
  }
  function finalPorRey(pos) {
    return casillaDelRey(pos, "b") === null ? "derrota" : casillaDelRey(pos, "n") === null ? "victoria" : null;
  }

  // src/utilidades/ajedrez/scorm-entrada.ts
  window.LudusAjedrez = __spreadProps(__spreadValues(__spreadValues({}, motor_exports), capturas_exports), { elegirJugada });
})();
