/*
 * Memorama dentro del paquete SCORM. Mismas reglas que en Ludus: se voltean
 * dos fichas por turno, por rondas, y el puntaje es 100 x parejas /
 * movimientos. Es ludico: el intento se registra sin nota.
 */
(function () {
  'use strict';

  var C;
  var estado = null;

  function el(id) {
    return C.elemento(id);
  }

  function pintarIndicadores() {
    var p = estado.partida;
    el('memorama-ronda').textContent = 'Ronda ' + estado.ronda + ' de ' + p.rondas;
    el('memorama-parejas').textContent = 'Parejas ' + estado.paresRonda + ' / ' + p.paresPorRonda;
    el('memorama-movimientos').textContent = 'Movimientos ' + estado.movimientos;
    el('memorama-tiempo').textContent = C.formatearTiempo(estado.segundos);
  }

  function armarRonda() {
    var p = estado.partida;
    var iconos = C.mezclar(p.mazo.iconos).slice(0, p.paresPorRonda);
    estado.cartas = C.mezclar(iconos.concat(iconos)).map(function (icono) {
      return { icono: icono, volteada: false, emparejada: false, boton: null };
    });
    estado.elegidas = [];
    estado.bloqueado = false;
    estado.paresRonda = 0;

    var tablero = el('memorama-tablero');
    tablero.innerHTML = '';
    var n = estado.cartas.length;
    tablero.style.setProperty('--columnas', n <= 16 ? '4' : n <= 20 ? '5' : '6');

    estado.cartas.forEach(function (carta) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'carta';
      boton.innerHTML =
        '<span class="cartaInterior"><span class="cara dorso"></span>' +
        '<span class="cara frente"><img class="iconoCarta" alt="" draggable="false" /></span></span>';
      boton.querySelector('img').src = C.urlArchivo(carta.icono);
      boton.addEventListener('click', function () {
        voltear(carta);
      });
      carta.boton = boton;
      tablero.appendChild(boton);
    });
    pintarIndicadores();
  }

  function pintarCarta(carta) {
    carta.boton.className =
      'carta' +
      (carta.volteada || carta.emparejada ? ' cartaVolteada' : '') +
      (carta.emparejada ? ' cartaEmparejada' : '');
  }

  function voltear(carta) {
    if (estado.terminado || estado.bloqueado || carta.volteada || carta.emparejada) return;
    carta.volteada = true;
    pintarCarta(carta);
    estado.elegidas.push(carta);
    if (estado.elegidas.length < 2) return;

    estado.movimientos += 1;
    var a = estado.elegidas[0];
    var b = estado.elegidas[1];
    estado.elegidas = [];

    if (a.icono === b.icono) {
      a.emparejada = true;
      b.emparejada = true;
      pintarCarta(a);
      pintarCarta(b);
      estado.paresRonda += 1;
      estado.paresTotales += 1;
      pintarIndicadores();
      if (estado.paresRonda === estado.partida.paresPorRonda) terminarRonda();
      return;
    }
    pintarIndicadores();
    estado.bloqueado = true;
    setTimeout(function () {
      a.volteada = false;
      b.volteada = false;
      pintarCarta(a);
      pintarCarta(b);
      estado.bloqueado = false;
    }, estado.partida.volteoMs);
  }

  function terminarRonda() {
    if (estado.ronda < estado.partida.rondas) {
      el('memorama-aviso-titulo').textContent = 'Ronda ' + estado.ronda + ' superada';
      el('memorama-aviso').classList.remove('oculto');
      return;
    }
    estado.terminado = true;
    clearInterval(estado.reloj);
    var puntaje = estado.movimientos
      ? Math.round((100 * estado.paresTotales) / estado.movimientos)
      : 0;
    C.registrarPuntaje(
      puntaje,
      'Encontraste ' + estado.paresTotales + ' parejas en ' + estado.movimientos + ' movimientos.',
    );
  }

  function siguienteRonda() {
    el('memorama-aviso').classList.add('oculto');
    estado.ronda += 1;
    armarRonda();
  }

  function iniciar() {
    C = window.LudusComun;
    C.pedir('/partida')
      .then(function (partida) {
        if (estado && estado.reloj) clearInterval(estado.reloj);
        estado = {
          partida: partida,
          ronda: 1,
          movimientos: 0,
          paresTotales: 0,
          segundos: 0,
          terminado: false,
          reloj: null,
        };
        el('memorama-titulo').textContent = partida.titulo;
        el('memorama-instrucciones').textContent = partida.instrucciones;
        el('memorama-estudiante').textContent = C.estudiante().nombre;
        el('memorama-aviso').classList.add('oculto');

        var mesa = el('memorama-mesa');
        var mazo = partida.mazo;
        mesa.style.setProperty('--fondo-mesa', mazo.fondo ? 'url("' + C.urlArchivo(mazo.fondo) + '")' : 'none');
        mesa.style.setProperty('--dorso', mazo.imagenFicha ? 'url("' + C.urlArchivo(mazo.imagenFicha) + '")' : 'none');
        mesa.style.setProperty('--giro', Math.min(450, partida.volteoMs / 3) + 'ms');

        armarRonda();
        estado.reloj = setInterval(function () {
          estado.segundos += 1;
          pintarIndicadores();
        }, 1000);
        C.mostrarPantalla('pantalla-memorama');
      })
      .catch(function (fallo) {
        C.mostrarError(fallo.message);
      });
  }

  function enlazar() {
    document.getElementById('memorama-siguiente').addEventListener('click', siguienteRonda);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enlazar);
  } else {
    enlazar();
  }

  window.LudusJuegos = window.LudusJuegos || {};
  window.LudusJuegos.memorama = { iniciar: iniciar };
})();
