/*
 * Ajedrez de Preguntas dentro del paquete SCORM. Mismas reglas que
 * frontend/src/componentes/juegos/Ajedrez.vue; el motor y el bot vienen de
 * ajedrez-motor.js (window.LudusAjedrez), compilado del mismo codigo que usa
 * Ludus. Las preguntas, la correccion, el tiempo y la nota los lleva Ludus:
 * el paquete solo reporta la nota al LMS.
 */
(function () {
  'use strict';

  var C;
  var M;
  var estado = null;

  var TEXTO_DESENLACE = {
    victoria: 'Le ganaste al bot.',
    derrota: 'El bot gano la partida.',
    tablas: 'La partida termino en tablas.',
    tiempo: 'Se acabo el tiempo.',
    rendicion: 'Te rendiste.',
  };

  /* Las seis figuras, iguales a PiezaAjedrez.vue. */
  var BASE = '<path d="M10 39 Q11 33 22.5 33 Q34 33 35 39 Z"/>';
  var FIGURAS = {
    p: '<circle cx="22.5" cy="13" r="5.5"/><path d="M17.5 21.5 Q22.5 17.5 27.5 21.5 L30 33 H15 Z"/>' + BASE,
    t: '<path d="M11 8 H15.5 V11.5 H20 V8 H25 V11.5 H29.5 V8 H34 V15.5 L31 18.5 V30 L34 33 V38.5 H11 V33 L14 30 V18.5 L11 15.5 Z"/><path class="piezaDetalle" d="M14 18.5 H31 M14 30 H31"/>',
    a: '<circle cx="22.5" cy="7.5" r="2.6"/><path d="M22.5 10.5 C15.5 15.5 13.5 22 17 27.5 H28 C31.5 22 29.5 15.5 22.5 10.5 Z"/><path d="M15.5 27.5 H29.5 V31.5 H15.5 Z"/>' + BASE + '<path class="piezaDetalle" d="M19.5 17 L25.5 22.5"/>',
    c: '<path d="M12.5 38.5 H33 V34 C33.5 25 31 18 26.5 13 L27 8 L23.5 10.5 L21 8.5 L19.5 13 C15 15.5 11 20.5 9.5 25.5 L12.5 28 L17 25 L19.5 25.5 C15.5 29.5 13.5 33.5 12.5 38.5 Z"/><circle class="piezaOjo" cx="19.5" cy="17.5" r="1.4"/>',
    d: '<path d="M11.5 31 L8 15.5 L14.5 24 L15.5 12.5 L19.5 23 L22.5 10.5 L25.5 23 L29.5 12.5 L30.5 24 L37 15.5 L33.5 31 Z"/><circle cx="8" cy="14" r="2.2"/><circle cx="15.5" cy="11" r="2.2"/><circle cx="22.5" cy="9" r="2.2"/><circle cx="29.5" cy="11" r="2.2"/><circle cx="37" cy="14" r="2.2"/>' + BASE,
    r: '<path d="M21 3.5 H24 V6.5 H27 V9.5 H24 V13.5 H21 V9.5 H18 V6.5 H21 Z"/><path d="M22.5 13.5 C30 13.5 36.5 17.5 34.5 24.5 L31 31 H14 L10.5 24.5 C8.5 17.5 15 13.5 22.5 13.5 Z"/>' + BASE + '<path class="piezaDetalle" d="M14 31 H31"/>',
  };

  function el(id) {
    return C.elemento(id);
  }

  function mostrar(id, visible) {
    el(id).classList.toggle('oculto', !visible);
  }

  function ruta(sufijo) {
    return '/ajedrez/' + estado.partida.partidaId + sufijo;
  }

  /* ------------------------------------------------------------------ *
   * Tablero
   * ------------------------------------------------------------------ */

  function destinos() {
    return estado.seleccion === null ? [] : M.jugadasDesde(estado.pos, estado.seleccion);
  }

  function bloqueado() {
    return estado.etapa !== 'jugando' || estado.pos.turno !== 'b' || estado.piensa || estado.captura || estado.terminando;
  }

  function pintar() {
    var tablero = el('ajedrez-tablero');
    tablero.innerHTML = '';
    var posibles = destinos();
    var jaque = M.enJaque(estado.pos, estado.pos.turno) ? M.casillaDelRey(estado.pos, estado.pos.turno) : null;
    for (var casilla = 0; casilla < 64; casilla++) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.setAttribute('data-casilla', M.nombreDe(casilla));
      var clase = 'ajedrezCasilla ' + ((M.fila(casilla) + M.columna(casilla)) % 2 === 0 ? 'ajedrezClara' : 'ajedrezOscura');
      if (estado.ultima && (estado.ultima.desde === casilla || estado.ultima.hasta === casilla)) clase += ' ajedrezUltima';
      if (estado.seleccion === casilla) clase += ' ajedrezSeleccion';
      if (jaque === casilla) clase += ' ajedrezJaque';
      for (var i = 0; i < posibles.length; i++) {
        if (posibles[i].hasta === casilla) clase += posibles[i].captura ? ' ajedrezDestinoCaptura' : ' ajedrezDestino';
      }
      boton.className = clase;
      var pieza = estado.pos.tablero[casilla];
      if (pieza) {
        boton.setAttribute('data-pieza', pieza.color + pieza.tipo + '@' + M.nombreDe(casilla));
        var animar = estado.animar && estado.animar.hasta === casilla ? estado.animar : null;
        boton.innerHTML =
          '<svg viewBox="0 0 45 45" class="' + (pieza.color === 'b' ? 'piezaBlanca' : 'piezaNegra') +
          (animar ? ' ajedrezLlega' : '') + '"' +
          (animar ? ' style="--dx:' + animar.dx + ';--dy:' + animar.dy + '"' : '') +
          '>' + FIGURAS[pieza.tipo] + '</svg>';
      }
      if (estado.destello && estado.destello.casilla === casilla) {
        boton.className += estado.destello.correcta ? ' ajedrezDestelloBien' : ' ajedrezDestelloMal';
      }
      boton.disabled = bloqueado();
      boton.addEventListener('click', elegirCasilla.bind(null, casilla));
      tablero.appendChild(boton);
    }
    // Las animaciones se ven una sola vez: el siguiente repintado no las repite.
    estado.animar = null;
    estado.destello = null;
    el('ajedrez-marcador').textContent = estado.correctas + ' de ' + estado.respondidas + ' bien';
  }

  function elegirCasilla(casilla) {
    var posibles = destinos();
    for (var i = 0; i < posibles.length; i++) {
      if (posibles[i].hasta === casilla) {
        estado.seleccion = null;
        jugarEstudiante(posibles[i]);
        return;
      }
    }
    var pieza = estado.pos.tablero[casilla];
    estado.seleccion = pieza && pieza.color === 'b' && estado.seleccion !== casilla ? casilla : null;
    pintar();
  }

  function mensaje(texto) {
    el('ajedrez-mensaje').textContent = texto;
  }

  /* La pieza que llega se dibuja desde su casilla de origen y se desliza (CSS --dx/--dy). */
  function mover(jugada, exito, destello) {
    estado.pos = M.aplicar(estado.pos, jugada, exito);
    estado.ultima = { desde: jugada.desde, hasta: jugada.hasta };
    if (!jugada.captura || exito) {
      estado.animar = {
        hasta: jugada.hasta,
        dx: M.columna(jugada.desde) - M.columna(jugada.hasta),
        dy: M.fila(jugada.desde) - M.fila(jugada.hasta),
      };
    }
    if (destello) estado.destello = { casilla: jugada.casillaCaptura !== null ? jugada.casillaCaptura : jugada.hasta, correcta: destello === 'bien' };
    pintar();
  }

  /* ------------------------------------------------------------------ *
   * Turnos
   * ------------------------------------------------------------------ */

  function jugarEstudiante(jugada) {
    if (!jugada.captura) {
      mover(jugada, true);
      turnoBot();
      return;
    }
    var captura = M.describirCaptura(jugada, true);
    if (captura.confirmar) confirmarCritica(captura);
    else abrirPregunta(captura);
  }

  function confirmarCritica(datos) {
    estado.captura = datos;
    pintar();
    el('ajedrez-contexto').textContent = datos.contexto;
    el('ajedrez-aviso').textContent = datos.aviso;
    mostrar('ajedrez-aviso', true);
    el('ajedrez-pregunta').textContent = 'Si respondes mal, pierdes la partida. Quieres capturar con el rey?';
    el('ajedrez-opciones').innerHTML = '';
    mostrar('ajedrez-resultado', false);
    mostrar('ajedrez-critica', true);
    mostrar('ajedrez-velo', true);
  }

  function turnoBot() {
    if (estado.etapa !== 'jugando' || estado.terminando || revisarFinal()) return;
    estado.piensa = true;
    mensaje('El bot esta pensando...');
    el('ajedrez-mensaje').classList.add('ajedrezPiensa');
    pintar();
    setTimeout(function () {
      var jugada = M.elegirJugada(estado.pos);
      estado.piensa = false;
      el('ajedrez-mensaje').classList.remove('ajedrezPiensa');
      if (estado.etapa !== 'jugando' || estado.terminando) return;
      if (!jugada) {
        revisarFinal();
        return;
      }
      if (!jugada.captura) {
        mover(jugada, true);
        mensaje('El bot jugo ' + M.notacion(jugada) + '. Tu turno.');
        revisarFinal();
        return;
      }
      var captura = M.describirCaptura(jugada, false);
      estado.ultima = { desde: jugada.desde, hasta: jugada.hasta };
      mensaje(
        captura.modo === 'critica'
          ? 'El bot ataca tu rey: responde bien para salvarlo.'
          : 'El bot ataca: responde para defender tu pieza.',
      );
      abrirPregunta(captura);
    }, 450);
  }

  /* ------------------------------------------------------------------ *
   * Preguntas
   * ------------------------------------------------------------------ */

  function abrirPregunta(datos) {
    estado.captura = datos;
    el('ajedrez-tarjeta').classList.remove('ajedrezSacudir', 'ajedrezBrillo');
    mostrar('ajedrez-critica', false);
    pintar();
    C.pedir(ruta('/pregunta'), { metodo: 'POST', cuerpo: { modo: datos.modo } })
      .then(function (pregunta) {
        estado.pregunta = pregunta;
        el('ajedrez-contexto').textContent = datos.contexto;
        el('ajedrez-aviso').textContent = datos.aviso || '';
        mostrar('ajedrez-aviso', !!datos.aviso);
        el('ajedrez-pregunta').textContent = pregunta.texto;
        var opciones = el('ajedrez-opciones');
        opciones.innerHTML = '';
        pregunta.opciones.forEach(function (opcion, i) {
          var boton = document.createElement('button');
          boton.type = 'button';
          boton.className = 'ajedrezOpcion';
          boton.textContent = 'ABCD'[i] + '. ' + opcion.texto;
          boton.addEventListener('click', function () {
            responder(opcion.id);
          });
          opciones.appendChild(boton);
        });
        mostrar('ajedrez-resultado', false);
        mostrar('ajedrez-velo', true);
      })
      .catch(function (fallo) {
        estado.captura = null;
        if (/tiempo/i.test(fallo.message)) {
          terminar('tiempo');
          return;
        }
        C.mostrarError(fallo.message);
      });
  }

  function responder(opcionId) {
    var botones = el('ajedrez-opciones').querySelectorAll('button');
    for (var i = 0; i < botones.length; i++) botones[i].disabled = true;
    C.pedir(ruta('/responder'), {
      metodo: 'POST',
      cuerpo: { preguntaId: estado.pregunta.preguntaId, opcionId: opcionId },
    })
      .then(function (veredicto) {
        estado.respondidas = veredicto.respondidas;
        estado.correctas = veredicto.correctas;
        estado.veredicto = veredicto.correcta;
        el('ajedrez-opciones').innerHTML = '';
        el('ajedrez-resultado-texto').textContent = textoResultado(estado.captura, veredicto.correcta);
        el('ajedrez-resultado').className = 'ajedrezResultado ' + (veredicto.correcta ? 'ajedrezBien' : 'ajedrezMal');
        var tarjeta = el('ajedrez-tarjeta');
        tarjeta.classList.remove('ajedrezSacudir', 'ajedrezBrillo');
        void tarjeta.offsetWidth;
        tarjeta.classList.add(veredicto.correcta ? 'ajedrezBrillo' : 'ajedrezSacudir');
      })
      .catch(function (fallo) {
        C.mostrarError(fallo.message);
      });
  }

  function textoResultado(datos, correcta) {
    if (!datos.jugada) return correcta ? 'Correcto!' : 'Incorrecto.';
    return M.textoResultado(datos, correcta);
  }

  function continuar() {
    var datos = estado.captura;
    var correcta = estado.veredicto;
    estado.captura = null;
    estado.pregunta = null;
    mostrar('ajedrez-velo', false);
    if (!datos) return;

    if (estado.etapa === 'examen') {
      siguienteExamen();
      return;
    }
    // Si responde bien, gana su pieza: si ataco, la captura sale; si defendia, el ataque falla.
    mover(datos.jugada, M.capturaExitosa(datos, correcta), correcta ? 'bien' : 'mal');
    // Si cayo un rey, la partida termina (despues de ver la animacion).
    var porRey = M.finalPorRey(estado.pos);
    if (porRey) {
      mensaje(porRey === 'victoria' ? 'Cayo el rey enemigo!' : 'Cayo tu rey.');
      setTimeout(function () {
        terminar(porRey);
      }, 650);
      return;
    }
    if (estado.tiempoAgotado) return terminar('tiempo');
    if (datos.deEstudiante) {
      turnoBot();
    } else {
      mensaje('Tu turno.');
      revisarFinal();
    }
  }

  function revisarFinal() {
    var final = M.finalDe(estado.pos);
    if (!final) return false;
    if (final === 'mate') terminar(estado.pos.turno === 'n' ? 'victoria' : 'derrota');
    else terminar('tablas');
    return true;
  }

  /* ------------------------------------------------------------------ *
   * Fin y modo examen
   * ------------------------------------------------------------------ */

  function terminar(desenlace) {
    if (estado.terminando || estado.etapa === 'final') return;
    estado.terminando = true;
    clearInterval(estado.reloj);
    estado.desenlace = estado.desenlace || desenlace;
    C.pedir(ruta('/terminar'), { metodo: 'POST', cuerpo: { desenlace: desenlace } })
      .then(function (cierre) {
        estado.terminando = false;
        if (cierre.examen) {
          estado.etapa = 'examen';
          el('ajedrez-mesa').classList.add('ajedrezExamen');
          mostrar('ajedrez-rendirse', false);
          mensaje(
            TEXTO_DESENLACE[cierre.desenlace] +
              ' Te salieron menos de ' + estado.partida.minimoPreguntas +
              ' preguntas: responde las que faltan para calificar.',
          );
          siguienteExamen();
          return;
        }
        cerrar(cierre);
      })
      .catch(function (fallo) {
        C.mostrarError(fallo.message);
      });
  }

  function siguienteExamen() {
    if (estado.respondidas >= estado.partida.minimoPreguntas) {
      C.pedir(ruta('/terminar'), { metodo: 'POST', cuerpo: { desenlace: estado.desenlace || 'tiempo' } })
        .then(cerrar)
        .catch(function (fallo) {
          C.mostrarError(fallo.message);
        });
      return;
    }
    var faltan = estado.partida.minimoPreguntas - estado.respondidas;
    abrirPregunta({
      jugada: null,
      deEstudiante: true,
      modo: 'normal',
      contexto: 'Modo examen: ' + (faltan === 1 ? 'falta 1 pregunta' : 'faltan ' + faltan + ' preguntas'),
      aviso: null,
    });
  }

  function cerrar(cierre) {
    estado.etapa = 'final';
    C.cerrarPartida(
      cierre,
      (TEXTO_DESENLACE[cierre.desenlace] || '') +
        ' Respondiste bien ' + cierre.correctas + ' de ' + cierre.respondidas + ' pregunta(s)' +
        (cierre.enExamen ? ' (' + cierre.enExamen + ' en modo examen).' : '.'),
    );
  }

  /* ------------------------------------------------------------------ *
   * Arranque
   * ------------------------------------------------------------------ */

  function comenzar() {
    mostrar('ajedrez-portada', false);
    mostrar('ajedrez-mesa', true);
    estado.etapa = 'jugando';
    mensaje('Tu turno: juegas con blancas.');
    pintar();
    if (estado.partida.minutos) {
      var tiempo = el('ajedrez-tiempo');
      mostrar('ajedrez-tiempo', true);
      var restantes = estado.partida.minutos * 60;
      tiempo.textContent = C.formatearTiempo(restantes);
      estado.reloj = setInterval(function () {
        restantes -= 1;
        tiempo.textContent = C.formatearTiempo(Math.max(0, restantes));
        if (restantes <= 0 && !estado.tiempoAgotado) {
          estado.tiempoAgotado = true;
          if (!estado.captura) terminar('tiempo');
        }
      }, 1000);
    }
  }

  function iniciar() {
    C = window.LudusComun;
    M = window.LudusAjedrez;
    if (estado && estado.reloj) clearInterval(estado.reloj);
    C.pedir('/ajedrez', { metodo: 'POST' })
      .then(function (partida) {
        estado = {
          partida: partida,
          pos: M.posicionInicial(),
          etapa: 'inicio',
          seleccion: null,
          ultima: null,
          animar: null,
          destello: null,
          piensa: false,
          captura: null,
          pregunta: null,
          veredicto: null,
          respondidas: 0,
          correctas: 0,
          tiempoAgotado: false,
          terminando: false,
          desenlace: null,
          reloj: null,
        };
        el('ajedrez-titulo').textContent = partida.titulo;
        el('ajedrez-estudiante').textContent = C.estudiante().nombre;
        el('ajedrez-instrucciones').textContent = partida.instrucciones || '';
        el('ajedrez-minimo').textContent = 'minimo ' + partida.minimoPreguntas;
        var reglas = [
          'Juegas con blancas contra el bot. Para terminar, dale jaque mate.',
          'Cada vez que dos piezas chocan sale una pregunta: si aciertas, tu pieza sobrevive; si fallas, la comida es la tuya.',
          'Valen el enroque, la captura al paso y la coronacion. Si estas en jaque, solo puedes jugar para salir de el.',
          'Si tu rey captura, o el bot ataca a tu rey, la pregunta es critica: fallarla te hace perder la partida.',
          'Si una captura fallida deja al rey enemigo expuesto, puedes atacarlo: si aciertas la pregunta, lo capturas y ganas.',
          'Tu nota es la parte de preguntas que respondas bien' +
            (partida.minutos ? '. Tienes ' + partida.minutos + ' minuto(s)' : '') +
            '. Si te salen menos de ' + partida.minimoPreguntas + ', las que falten se responden en modo examen.',
        ];
        el('ajedrez-reglas').innerHTML = '';
        reglas.forEach(function (texto) {
          var li = document.createElement('li');
          li.textContent = texto;
          el('ajedrez-reglas').appendChild(li);
        });
        el('ajedrez-mesa').classList.remove('ajedrezExamen');
        mostrar('ajedrez-rendirse', true);
        mostrar('ajedrez-velo', false);
        mostrar('ajedrez-tiempo', false);
        mostrar('ajedrez-portada', true);
        mostrar('ajedrez-mesa', false);
        C.mostrarPantalla('pantalla-ajedrez');
      })
      .catch(function (fallo) {
        C.mostrarError(fallo.message);
      });
  }

  function enlazar() {
    document.getElementById('ajedrez-comenzar').addEventListener('click', comenzar);
    document.getElementById('ajedrez-continuar').addEventListener('click', continuar);
    document.getElementById('ajedrez-aceptar').addEventListener('click', function () {
      if (estado && estado.captura) abrirPregunta(estado.captura);
    });
    document.getElementById('ajedrez-cancelar').addEventListener('click', function () {
      estado.captura = null;
      mostrar('ajedrez-velo', false);
      pintar();
    });
    document.getElementById('ajedrez-rendirse').addEventListener('click', function () {
      if (estado && estado.etapa === 'jugando' && !estado.captura && window.confirm('Seguro que quieres rendirte? La nota sale de las preguntas que respondiste.')) {
        terminar('rendicion');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enlazar);
  } else {
    enlazar();
  }

  window.LudusJuegos = window.LudusJuegos || {};
  window.LudusJuegos.ajedrez = { iniciar: iniciar };
})();
