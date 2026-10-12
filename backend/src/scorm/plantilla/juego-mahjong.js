/*
 * Mahjong solitario dentro del paquete SCORM. Misma logica que
 * frontend/src/componentes/juegos/mahjong/tablero.ts: capas en piramide, una
 * ficha esta libre si no tiene otra encima y le queda un costado sin tapar, y
 * el reparto se hace "jugando al reves" para que siempre tenga solucion.
 * Ludico: el intento se registra sin nota.
 */
(function () {
  'use strict';

  var C;
  var estado = null;

  var DISPOSICIONES = {
    pequeno: { ancho: 6, alto: 4, capas: [[0, 0, 6, 4], [1, 1, 4, 2], [2, 1, 2, 2]] },
    mediano: { ancho: 8, alto: 6, capas: [[0, 0, 8, 6], [1, 1, 6, 4], [2, 2, 4, 2]] },
    grande: { ancho: 10, alto: 6, capas: [[0, 0, 10, 6], [1, 1, 8, 4], [2, 2, 6, 2], [4, 2, 2, 2]] },
  };

  function el(id) {
    return C.elemento(id);
  }

  function llave(x, y, z) {
    return x + ',' + y + ',' + z;
  }

  function posiciones(tamano) {
    var lista = [];
    DISPOSICIONES[tamano].capas.forEach(function (capa, z) {
      for (var y = 0; y < capa[3]; y++) {
        for (var x = 0; x < capa[2]; x++) lista.push({ x: capa[0] + x, y: capa[1] + y, z: z });
      }
    });
    return lista;
  }

  function libreEn(p, ocupadas) {
    if (ocupadas[llave(p.x, p.y, p.z + 1)]) return false;
    return !ocupadas[llave(p.x - 1, p.y, p.z)] || !ocupadas[llave(p.x + 1, p.y, p.z)];
  }

  function ocupadasDe(fichas) {
    var ocupadas = {};
    fichas.forEach(function (f) {
      if (!f.retirada) ocupadas[llave(f.x, f.y, f.z)] = true;
    });
    return ocupadas;
  }

  /** Reparte los iconos de a pares desde el tablero lleno; null si se traba siempre. */
  function repartir(lugares, iconosPorPar) {
    for (var intento = 0; intento < 60; intento++) {
      var ocupadas = {};
      lugares.forEach(function (p) {
        ocupadas[llave(p.x, p.y, p.z)] = true;
      });
      var asignados = {};
      var trabado = false;
      var pares = C.mezclar(iconosPorPar);
      for (var i = 0; i < pares.length; i++) {
        var libres = C.mezclar(
          lugares.filter(function (p) {
            return ocupadas[llave(p.x, p.y, p.z)] && libreEn(p, ocupadas);
          }),
        );
        if (libres.length < 2) {
          trabado = true;
          break;
        }
        for (var k = 0; k < 2; k++) {
          asignados[llave(libres[k].x, libres[k].y, libres[k].z)] = pares[i];
          delete ocupadas[llave(libres[k].x, libres[k].y, libres[k].z)];
        }
      }
      if (!trabado) return asignados;
    }
    return null;
  }

  function generar(tamano, iconos) {
    var lugares = posiciones(tamano);
    var elegidos = C.mezclar(iconos);
    var iconosPorPar = [];
    for (var i = 0; i < lugares.length / 2; i++) {
      iconosPorPar.push(elegidos[Math.floor(i / 2) % elegidos.length]);
    }
    var asignados = repartir(lugares, iconosPorPar);
    return lugares.map(function (p, id) {
      return { id: id, x: p.x, y: p.y, z: p.z, icono: asignados[llave(p.x, p.y, p.z)], retirada: false };
    });
  }

  /** false si lo que queda no tiene salida con ningun reparto. */
  function barajar() {
    var quedan = estado.fichas.filter(function (f) {
      return !f.retirada;
    });
    var conteo = {};
    quedan.forEach(function (f) {
      conteo[f.icono] = (conteo[f.icono] || 0) + 1;
    });
    var iconosPorPar = [];
    Object.keys(conteo).forEach(function (icono) {
      for (var i = 0; i < conteo[icono] / 2; i++) iconosPorPar.push(icono);
    });
    var asignados = repartir(quedan, iconosPorPar);
    if (!asignados) return false;
    quedan.forEach(function (f) {
      f.icono = asignados[llave(f.x, f.y, f.z)];
    });
    return true;
  }

  function libres() {
    var ocupadas = ocupadasDe(estado.fichas);
    return estado.fichas.filter(function (f) {
      return !f.retirada && libreEn(f, ocupadas);
    });
  }

  function pista() {
    var lista = libres();
    for (var i = 0; i < lista.length; i++) {
      for (var j = i + 1; j < lista.length; j++) {
        if (lista[i].icono === lista[j].icono) return [lista[i], lista[j]];
      }
    }
    return null;
  }

  function quedan() {
    return estado.fichas.filter(function (f) {
      return !f.retirada;
    }).length;
  }

  /* ------------------------------------------------------------------ */

  /** Tamano de ficha segun el ancho de la mesa: el tablero entra entero. */
  function dimensionar() {
    var disposicion = DISPOSICIONES[estado.partida.tamano];
    var ancho = el('mahjong-mesa').clientWidth - 40;
    var w = Math.max(24, Math.min(70, ancho / (disposicion.ancho + 0.6)));
    var tablero = el('mahjong-tablero');
    tablero.style.setProperty('--w', w + 'px');
    tablero.style.setProperty('--h', w * 1.28 + 'px');
    tablero.style.setProperty('--d', w * 0.09 + 'px');
    tablero.style.setProperty('--columnas', String(disposicion.ancho));
    tablero.style.setProperty('--filas', String(disposicion.alto));
    tablero.style.setProperty('--capas', String(disposicion.capas.length));
  }

  function pintar() {
    var tablero = el('mahjong-tablero');
    tablero.innerHTML = '';
    var idsLibres = {};
    libres().forEach(function (f) {
      idsLibres[f.id] = true;
    });

    estado.fichas.forEach(function (f) {
      if (f.retirada) return;
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className =
        'ficha ' +
        (idsLibres[f.id] ? 'fichaLibre' : 'fichaTapada') +
        (estado.seleccionada === f.id ? ' fichaSeleccionada' : '') +
        (estado.resaltadas.indexOf(f.id) > -1 ? ' fichaPista' : '');
      boton.style.setProperty('--x', String(f.x));
      boton.style.setProperty('--y', String(f.y));
      boton.style.setProperty('--z', String(f.z));
      boton.style.zIndex = String(f.z * 1000 + f.y * 30 + f.x);
      var imagen = document.createElement('img');
      imagen.className = 'iconoFicha';
      imagen.alt = '';
      imagen.draggable = false;
      imagen.src = C.urlArchivo(f.icono);
      boton.appendChild(imagen);
      boton.addEventListener('click', function () {
        tocar(f, idsLibres[f.id]);
      });
      tablero.appendChild(boton);
    });

    el('mahjong-fichas').textContent = 'Fichas ' + quedan();
    el('mahjong-barajadas').textContent = 'Barajadas ' + estado.barajadas;
    revisarAvisos();
  }

  function mostrarAviso(titulo, texto, boton, accion) {
    el('mahjong-aviso-titulo').textContent = titulo;
    el('mahjong-aviso-texto').textContent = texto;
    el('mahjong-aviso-boton').textContent = boton;
    estado.accionAviso = accion;
    el('mahjong-aviso').classList.remove('oculto');
  }

  function revisarAvisos() {
    el('mahjong-aviso').classList.add('oculto');
    if (estado.terminado || quedan() === 0) return;
    if (estado.trabado) {
      mostrarAviso(
        'El tablero quedo trabado',
        'Las fichas que quedan estan apiladas de forma que ningun reparto las libera.',
        'Terminar partida',
        terminar,
      );
    } else if (!pista()) {
      mostrarAviso('No quedan parejas libres', 'Baraja las fichas que quedan para seguir jugando.', 'Barajar', rebarajar);
    }
  }

  function tocar(ficha, libre) {
    if (estado.terminado) return;
    estado.resaltadas = [];
    if (!libre) return;
    if (estado.seleccionada === ficha.id) {
      estado.seleccionada = null;
    } else {
      var otra = estado.fichas[estado.seleccionada];
      if (estado.seleccionada !== null && otra && otra.icono === ficha.icono) {
        otra.retirada = true;
        ficha.retirada = true;
        estado.seleccionada = null;
        if (quedan() === 0) {
          pintar();
          terminar();
          return;
        }
      } else {
        estado.seleccionada = ficha.id;
      }
    }
    pintar();
  }

  function mostrarPista() {
    var par = pista();
    estado.resaltadas = par ? [par[0].id, par[1].id] : [];
    pintar();
  }

  function rebarajar() {
    if (estado.terminado) return;
    if (!barajar()) {
      estado.trabado = true;
    } else {
      estado.barajadas += 1;
    }
    estado.seleccionada = null;
    estado.resaltadas = [];
    pintar();
  }

  function terminar() {
    if (estado.terminado) return;
    estado.terminado = true;
    clearInterval(estado.reloj);
    var total = estado.fichas.length;
    var retiradas = total - quedan();
    var puntaje = Math.max(0, Math.round((100 * retiradas) / total) - estado.barajadas * 5);
    C.registrarPuntaje(
      puntaje,
      retiradas === total
        ? 'Vaciaste el tablero con ' + estado.barajadas + ' barajada(s).'
        : 'Retiraste ' + retiradas + ' de ' + total + ' fichas.',
    );
  }

  function iniciar() {
    C = window.LudusComun;
    C.pedir('/partida')
      .then(function (partida) {
        if (estado && estado.reloj) clearInterval(estado.reloj);
        estado = {
          partida: partida,
          fichas: [],
          seleccionada: null,
          resaltadas: [],
          barajadas: 0,
          segundos: 0,
          trabado: false,
          terminado: false,
          accionAviso: null,
          reloj: null,
        };
        el('mahjong-titulo').textContent = partida.titulo;
        el('mahjong-instrucciones').textContent = partida.instrucciones;
        el('mahjong-estudiante').textContent = C.estudiante().nombre;

        var mazo = partida.mazo;
        el('mahjong-mesa').style.setProperty('--fondo-mesa', mazo.fondo ? 'url("' + C.urlArchivo(mazo.fondo) + '")' : 'none');
        el('mahjong-tablero').style.setProperty(
          '--cuerpo',
          mazo.imagenFicha ? 'url("' + C.urlArchivo(mazo.imagenFicha) + '")' : 'none',
        );

        estado.fichas = generar(partida.tamano, mazo.iconos);
        C.mostrarPantalla('pantalla-mahjong');
        dimensionar();
        pintar();
        el('mahjong-tiempo').textContent = C.formatearTiempo(0);
        estado.reloj = setInterval(function () {
          estado.segundos += 1;
          el('mahjong-tiempo').textContent = C.formatearTiempo(estado.segundos);
        }, 1000);
      })
      .catch(function (fallo) {
        C.mostrarError(fallo.message);
      });
  }

  function enlazar() {
    document.getElementById('mahjong-pista').addEventListener('click', mostrarPista);
    document.getElementById('mahjong-barajar').addEventListener('click', rebarajar);
    document.getElementById('mahjong-terminar').addEventListener('click', terminar);
    document.getElementById('mahjong-aviso-boton').addEventListener('click', function () {
      if (estado && estado.accionAviso) estado.accionAviso();
    });
    window.addEventListener('resize', function () {
      if (estado && !estado.terminado) dimensionar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enlazar);
  } else {
    enlazar();
  }

  window.LudusJuegos = window.LudusJuegos || {};
  window.LudusJuegos.mahjong = { iniciar: iniciar };
})();
