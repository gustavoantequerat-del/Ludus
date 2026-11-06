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

  // src/utilidades/ajedrez/figuras.ts
  var BASE = '<path d="M10 39 Q11 33 22.5 33 Q34 33 35 39 Z"/>';
  function figura(tipo, clases) {
    let detalle = (d) => `<path class="${clases.detalle}" d="${d}"/>`;
    switch (tipo) {
      case "p":
        return '<circle cx="22.5" cy="13" r="5.5"/><path d="M17.5 21.5 Q22.5 17.5 27.5 21.5 L30 33 H15 Z"/>' + BASE;
      case "t":
        return '<path d="M11 8 H15.5 V11.5 H20 V8 H25 V11.5 H29.5 V8 H34 V15.5 L31 18.5 V30 L34 33 V38.5 H11 V33 L14 30 V18.5 L11 15.5 Z"/>' + detalle("M14 18.5 H31 M14 30 H31");
      case "a":
        return '<circle cx="22.5" cy="7.5" r="2.6"/><path d="M22.5 10.5 C15.5 15.5 13.5 22 17 27.5 H28 C31.5 22 29.5 15.5 22.5 10.5 Z"/><path d="M15.5 27.5 H29.5 V31.5 H15.5 Z"/>' + BASE + detalle("M19.5 17 L25.5 22.5");
      case "c":
        return `<path d="M12.5 38.5 H33 V34 C33.5 25 31 18 26.5 13 L27 8 L23.5 10.5 L21 8.5 L19.5 13 C15 15.5 11 20.5 9.5 25.5 L12.5 28 L17 25 L19.5 25.5 C15.5 29.5 13.5 33.5 12.5 38.5 Z"/><circle class="${clases.ojo}" cx="19.5" cy="17.5" r="1.4"/>`;
      case "d":
        return '<path d="M11.5 31 L8 15.5 L14.5 24 L15.5 12.5 L19.5 23 L22.5 10.5 L25.5 23 L29.5 12.5 L30.5 24 L37 15.5 L33.5 31 Z"/><circle cx="8" cy="14" r="2.2"/><circle cx="15.5" cy="11" r="2.2"/><circle cx="22.5" cy="9" r="2.2"/><circle cx="29.5" cy="11" r="2.2"/><circle cx="37" cy="14" r="2.2"/>' + BASE;
      default:
        return '<path d="M21 3.5 H24 V6.5 H27 V9.5 H24 V13.5 H21 V9.5 H18 V6.5 H21 Z"/><path d="M22.5 13.5 C30 13.5 36.5 17.5 34.5 24.5 L31 31 H14 L10.5 24.5 C8.5 17.5 15 13.5 22.5 13.5 Z"/>' + BASE + detalle("M14 31 H31");
    }
  }

  // src/utilidades/ajedrez/tutorial.ts
  var NOMBRES = {
    p: "Peon",
    c: "Caballo",
    a: "Alfil",
    t: "Torre",
    d: "Dama",
    r: "Rey"
  };
  function rayos(en, direcciones, columnas, filas, bloqueos = []) {
    let ocupada = (c, f) => bloqueos.some(([bc, bf]) => bc === c && bf === f), salida = [];
    for (let [dc, df] of direcciones) {
      let c = en[0] + dc, f = en[1] + df;
      for (; c >= 0 && f >= 0 && c < columnas && f < filas && !ocupada(c, f); )
        salida.push([c, f]), c += dc, f += df;
    }
    return salida;
  }
  var RECTAS2 = [[1, 0], [-1, 0], [0, 1], [0, -1]], DIAGONALES2 = [[1, 1], [1, -1], [-1, 1], [-1, -1]], PASOS_TUTORIAL = [
    {
      titulo: "Tus piezas",
      texto: [
        "Juegas con las blancas contra el bot y mueves primero. En cada turno mueves una sola pieza.",
        "Ganas si le das jaque mate al rey del bot: lo atrapas de forma que no pueda escapar.",
        "Para mover, toca una pieza tuya: se marcan las casillas a las que puede ir. Despues toca una de esas casillas."
      ],
      columnas: 6,
      filas: 1,
      nombres: !0,
      piezas: [
        { tipo: "p", color: "b", en: [0, 0] },
        { tipo: "c", color: "b", en: [1, 0] },
        { tipo: "a", color: "b", en: [2, 0] },
        { tipo: "t", color: "b", en: [3, 0] },
        { tipo: "d", color: "b", en: [4, 0] },
        { tipo: "r", color: "b", en: [5, 0] }
      ]
    },
    {
      titulo: "El peon",
      texto: [
        "Avanza recto hacia adelante, una casilla. En su primera jugada puede avanzar dos.",
        "Captura de otra forma: en diagonal, una casilla hacia adelante. Nunca retrocede."
      ],
      columnas: 5,
      filas: 5,
      piezas: [
        { tipo: "p", color: "b", en: [2, 3] },
        { tipo: "c", color: "n", en: [3, 2] }
      ],
      destinos: [[2, 2], [2, 1]],
      capturas: [[3, 2]],
      movimientos: [{ desde: [2, 3], hasta: [2, 1] }]
    },
    {
      titulo: "El caballo",
      texto: [
        "Se mueve en forma de L: dos casillas en una direccion y una hacia el costado.",
        "Es la unica pieza que salta por encima de las demas."
      ],
      columnas: 5,
      filas: 5,
      piezas: [
        { tipo: "c", color: "b", en: [2, 2] },
        { tipo: "p", color: "b", en: [2, 1] },
        { tipo: "p", color: "b", en: [3, 2] },
        { tipo: "a", color: "n", en: [3, 0] }
      ],
      destinos: [[1, 0], [0, 1], [4, 1], [0, 3], [4, 3], [1, 4], [3, 4]],
      capturas: [[3, 0]],
      movimientos: [{ desde: [2, 2], hasta: [1, 0] }]
    },
    {
      titulo: "El alfil",
      texto: [
        "Se mueve en diagonal, todas las casillas que quiera mientras no haya piezas en el camino.",
        "Siempre se queda en casillas del mismo color."
      ],
      columnas: 5,
      filas: 5,
      piezas: [
        { tipo: "a", color: "b", en: [2, 2] },
        { tipo: "t", color: "n", en: [4, 0] }
      ],
      destinos: rayos([2, 2], DIAGONALES2, 5, 5, [[4, 0]]),
      capturas: [[4, 0]],
      movimientos: [{ desde: [2, 2], hasta: [0, 4] }]
    },
    {
      titulo: "La torre",
      texto: ["Se mueve en linea recta: adelante, atras y a los costados, todas las casillas libres."],
      columnas: 5,
      filas: 5,
      piezas: [
        { tipo: "t", color: "b", en: [2, 2] },
        { tipo: "c", color: "n", en: [2, 0] }
      ],
      destinos: rayos([2, 2], RECTAS2, 5, 5, [[2, 0]]),
      capturas: [[2, 0]],
      movimientos: [{ desde: [2, 2], hasta: [4, 2] }]
    },
    {
      titulo: "La dama",
      texto: [
        "Es la torre y el alfil juntos: en linea recta y en diagonal, todas las casillas libres.",
        "Es tu pieza mas poderosa: cuidala."
      ],
      columnas: 5,
      filas: 5,
      piezas: [{ tipo: "d", color: "b", en: [2, 2] }],
      destinos: rayos([2, 2], [...RECTAS2, ...DIAGONALES2], 5, 5),
      movimientos: [{ desde: [2, 2], hasta: [0, 0] }]
    },
    {
      titulo: "El rey",
      texto: [
        "Se mueve una casilla en cualquier direccion.",
        "Nunca puede ir a una casilla atacada por el rival: aqui la torre negra ataca toda la fila de arriba."
      ],
      columnas: 5,
      filas: 5,
      piezas: [
        { tipo: "r", color: "b", en: [2, 2] },
        { tipo: "t", color: "n", en: [4, 1] }
      ],
      destinos: [[1, 2], [3, 2], [1, 3], [2, 3], [3, 3]],
      prohibidas: [[1, 1], [2, 1], [3, 1]],
      movimientos: [{ desde: [2, 2], hasta: [2, 3] }]
    },
    {
      titulo: "Capturar con una pregunta",
      texto: [
        "Capturas moviendo tu pieza a la casilla de una pieza rival. En este juego, antes sale una pregunta.",
        "Si aciertas, capturas. Si fallas, la que cae es tu pieza.",
        "Cuando el bot te ataca tambien sale una pregunta: si aciertas, tu pieza se salva."
      ],
      columnas: 5,
      filas: 4,
      piezas: [
        { tipo: "c", color: "b", en: [1, 3] },
        { tipo: "a", color: "n", en: [2, 1] }
      ],
      capturas: [[2, 1]],
      pregunta: [2, 1],
      movimientos: [{ desde: [1, 3], hasta: [2, 1] }]
    },
    {
      titulo: "Jaque y jaque mate",
      texto: [
        "Jaque es atacar al rey. Quien esta en jaque tiene que salvar a su rey en esa misma jugada.",
        "Jaque mate es cuando no hay forma de salvarlo: la partida termina. Aqui la torre da mate porque los peones negros encierran a su rey.",
        "Si tu rey esta en jaque, solo te deja hacer jugadas que lo saquen del jaque."
      ],
      columnas: 5,
      filas: 3,
      piezas: [
        { tipo: "t", color: "b", en: [0, 2] },
        { tipo: "r", color: "n", en: [3, 0] },
        { tipo: "p", color: "n", en: [2, 1] },
        { tipo: "p", color: "n", en: [3, 1] },
        { tipo: "p", color: "n", en: [4, 1] }
      ],
      jaque: [3, 0],
      movimientos: [{ desde: [0, 2], hasta: [0, 0] }]
    },
    {
      titulo: "Enroque",
      texto: [
        "Una vez por partida, el rey avanza dos casillas hacia una torre y esa torre salta al otro lado del rey.",
        "Se puede si ni el rey ni esa torre se movieron, no hay piezas en medio y el rey no esta en jaque ni pasa por casillas atacadas.",
        "Para hacerlo, toca tu rey y despues la casilla que esta a dos pasos."
      ],
      columnas: 8,
      filas: 2,
      piezas: [
        ...[0, 1, 2, 3, 4, 5, 6, 7].map((c) => ({ tipo: "p", color: "b", en: [c, 0] })),
        { tipo: "t", color: "b", en: [0, 1] },
        { tipo: "r", color: "b", en: [4, 1] },
        { tipo: "t", color: "b", en: [7, 1] }
      ],
      destinos: [[6, 1], [2, 1]],
      movimientos: [
        { desde: [4, 1], hasta: [6, 1] },
        { desde: [7, 1], hasta: [5, 1] }
      ]
    },
    {
      titulo: "Coronacion",
      texto: [
        "Si un peon tuyo llega hasta la ultima fila, se convierte en dama.",
        "Por eso conviene empujar los peones que tienen el camino libre."
      ],
      columnas: 5,
      filas: 3,
      piezas: [{ tipo: "p", color: "b", en: [2, 1] }],
      destinos: [[2, 0]],
      movimientos: [{ desde: [2, 1], hasta: [2, 0] }],
      corona: { tipo: "d", en: [2, 0] }
    },
    {
      titulo: "Captura al paso",
      texto: [
        "Si un peon rival avanza dos casillas y queda justo al lado de tu peon, en tu jugada siguiente puedes capturarlo como si hubiera avanzado una sola.",
        "Tu peon va a la casilla que el otro salto. Tambien sale una pregunta."
      ],
      columnas: 5,
      filas: 4,
      piezas: [
        { tipo: "p", color: "b", en: [2, 2] },
        { tipo: "p", color: "n", en: [3, 2] }
      ],
      resaltadas: [[3, 0], [3, 2]],
      destinos: [[2, 1]],
      capturas: [[3, 1]],
      movimientos: [{ desde: [2, 2], hasta: [3, 1] }]
    }
  ], LADO = 40, ALTO_NOMBRE = 18;
  function svgTutorial(paso, clases) {
    var _a, _b, _c, _d, _e, _f;
    let ancho = paso.columnas * LADO, alto = paso.filas * LADO + (paso.nombres ? ALTO_NOMBRE : 0), x = (p) => p[0] * LADO, y = (p) => p[1] * LADO, centro = (p) => `cx="${x(p) + LADO / 2}" cy="${y(p) + LADO / 2}"`, partes = [];
    for (let f = 0; f < paso.filas; f++)
      for (let c = 0; c < paso.columnas; c++) {
        let clase = (c + f) % 2 === 0 ? clases.clara : clases.oscura;
        partes.push(`<rect class="${clase}" x="${c * LADO}" y="${f * LADO}" width="${LADO}" height="${LADO}"/>`);
      }
    for (let p of (_a = paso.resaltadas) != null ? _a : [])
      partes.push(`<rect class="${clases.resaltada}" x="${x(p)}" y="${y(p)}" width="${LADO}" height="${LADO}"/>`);
    paso.jaque && partes.push(`<rect class="${clases.jaque}" x="${x(paso.jaque)}" y="${y(paso.jaque)}" width="${LADO}" height="${LADO}"/>`);
    let moviles = new Set(((_b = paso.movimientos) != null ? _b : []).map((m) => m.desde.join())), dibujarPieza = (tipo, color, p, extra = "") => `<svg class="${clases.pieza} ${color === "b" ? clases.blanca : clases.negra} ${extra}" x="${x(p) + 3}" y="${y(p) + 3}" width="${LADO - 6}" height="${LADO - 6}" viewBox="0 0 45 45">` + figura(tipo, { detalle: clases.detalle, ojo: clases.ojo }) + "</svg>";
    for (let pieza of paso.piezas) {
      let seMueve = moviles.has(pieza.en.join());
      partes.push(dibujarPieza(pieza.tipo, pieza.color, pieza.en, seMueve ? clases.origen : ""));
    }
    ((_c = paso.destinos) != null ? _c : []).forEach((p, i) => {
      partes.push(`<circle class="${clases.destino}" style="--i:${i}" ${centro(p)} r="6"/>`);
    }), ((_d = paso.capturas) != null ? _d : []).forEach((p, i) => {
      partes.push(`<circle class="${clases.captura}" style="--i:${i}" ${centro(p)} r="17"/>`);
    });
    for (let p of (_e = paso.prohibidas) != null ? _e : []) {
      let a = x(p) + 13, b = y(p) + 13;
      partes.push(`<path class="${clases.prohibida}" d="M${a} ${b} l14 14 M${a + 14} ${b} l-14 14"/>`);
    }
    for (let { desde, hasta } of (_f = paso.movimientos) != null ? _f : []) {
      let pieza = paso.piezas.find((pz) => pz.en[0] === desde[0] && pz.en[1] === desde[1]);
      if (!pieza) continue;
      let dx = (hasta[0] - desde[0]) * LADO, dy = (hasta[1] - desde[1]) * LADO;
      partes.push(`<g class="${clases.fantasma}" style="--dx:${dx}px;--dy:${dy}px">${dibujarPieza(pieza.tipo, pieza.color, desde)}</g>`);
    }
    if (paso.corona && partes.push(`<g class="${clases.corona}">${dibujarPieza(paso.corona.tipo, "b", paso.corona.en)}</g>`), paso.pregunta) {
      let cx = x(paso.pregunta) + LADO - 6, cy = y(paso.pregunta) + 6;
      partes.push(
        `<g class="${clases.pregunta}"><circle cx="${cx}" cy="${cy}" r="9"/><text class="${clases.preguntaTexto}" x="${cx}" y="${cy + 4}" text-anchor="middle">?</text></g>`
      );
    }
    if (paso.nombres)
      for (let pieza of paso.piezas)
        partes.push(
          `<text class="${clases.nombre}" x="${x(pieza.en) + LADO / 2}" y="${paso.filas * LADO + 13}" text-anchor="middle">${NOMBRES[pieza.tipo]}</text>`
        );
    return `<svg class="${clases.svg}" viewBox="0 0 ${ancho} ${alto}" role="img" aria-hidden="true">${partes.join("")}</svg>`;
  }

  // src/utilidades/ajedrez/scorm-entrada.ts
  window.LudusAjedrez = __spreadProps(__spreadValues(__spreadValues({}, motor_exports), capturas_exports), {
    elegirJugada,
    figura,
    PASOS_TUTORIAL,
    svgTutorial
  });
})();
