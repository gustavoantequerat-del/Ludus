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
    examen: 'Elegiste tomar el examen.',
  };

  /* Nombres de clase del tablerito del tutorial (las reglas viven en estilos.css). */
  var CLASES_TUTORIAL = {
    svg: 'tutSvg', clara: 'tutClara', oscura: 'tutOscura', resaltada: 'tutResaltada', destino: 'tutDestino',
    captura: 'tutCaptura', prohibida: 'tutProhibida', jaque: 'tutJaque', pregunta: 'tutPregunta',
    preguntaTexto: 'tutPreguntaTexto', pieza: 'tutPieza', blanca: 'piezaBlanca', negra: 'piezaNegra',
    detalle: 'piezaDetalle', ojo: 'piezaOjo', origen: 'tutOrigen', fantasma: 'tutFantasma', corona: 'tutCorona',
    nombre: 'tutNombre',
  };
  var CLASES_FIGURA = { detalle: 'piezaDetalle', ojo: 'piezaOjo' };

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
          '>' + M.figura(pieza.tipo, CLASES_FIGURA) + '</svg>';
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
        // El reloj termino mientras respondia: esa pregunta no cuenta.
        if (/tiempo/i.test(fallo.message)) {
          estado.captura = null;
          mostrar('ajedrez-velo', false);
          terminar('tiempo');
          return;
        }
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
          mostrar('ajedrez-examen', false);
          mostrar('ajedrez-tutorial-abrir', false);
          mensaje(
            cierre.desenlace === 'examen'
              ? 'Elegiste tomar el examen: responde las preguntas que faltan para completar ' +
                  estado.partida.minimoPreguntas + '.'
              : TEXTO_DESENLACE[cierre.desenlace] +
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
        mostrar('ajedrez-examen', true);
        mostrar('ajedrez-tutorial-abrir', true);
        mostrar('ajedrez-tutorial', false);
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

  /* ------------------------------------------------------------------ *
   * Tutorial
   * ------------------------------------------------------------------ */

  var pasoTutorial = 0;

  function pintarTutorial() {
    var pasos = M.PASOS_TUTORIAL;
    var paso = pasos[pasoTutorial];
    el('tut-contador').textContent = 'Como se juega · ' + (pasoTutorial + 1) + ' de ' + pasos.length;
    el('tut-titulo').textContent = paso.titulo;
    // Dibujo generado por svgTutorial con datos fijos del tutorial (no hay datos del usuario).
    el('tut-ilustracion').innerHTML = M.svgTutorial(paso, CLASES_TUTORIAL);
    var texto = el('tut-texto');
    texto.innerHTML = '';
    paso.texto.forEach(function (parrafo) {
      var p = document.createElement('p');
      p.textContent = parrafo;
      texto.appendChild(p);
    });
    var puntos = el('tut-puntos');
    puntos.innerHTML = '';
    pasos.forEach(function (otro, i) {
      var punto = document.createElement('button');
      punto.type = 'button';
      punto.className = 'tutPunto' + (i === pasoTutorial ? ' tutPuntoActivo' : '');
      punto.setAttribute('aria-label', 'Paso ' + (i + 1) + ': ' + otro.titulo);
      punto.addEventListener('click', function () {
        pasoTutorial = i;
        pintarTutorial();
      });
      puntos.appendChild(punto);
    });
    // Reinicia la animacion de entrada del paso.
    var cuerpo = el('tut-cuerpo');
    cuerpo.classList.remove('tutCuerpoEntra');
    void cuerpo.offsetWidth;
    cuerpo.classList.add('tutCuerpoEntra');
    mostrar('tut-anterior', pasoTutorial > 0);
    var ultimo = pasoTutorial === pasos.length - 1;
    el('tut-siguiente').textContent = ultimo
      ? estado && estado.etapa === 'inicio' ? 'Listo, a jugar' : 'Volver a la partida'
      : 'Siguiente';
  }

  function abrirTutorial() {
    pasoTutorial = 0;
    pintarTutorial();
    mostrar('ajedrez-tutorial', true);
  }

  function cerrarTutorial() {
    mostrar('ajedrez-tutorial', false);
  }

  function textoTomarExamen() {
    var faltan = estado.partida.minimoPreguntas - estado.respondidas;
    if (faltan <= 0) {
      return 'Ya respondiste ' + estado.respondidas + ' preguntas: la partida termina y se califica con lo que llevas. Seguir?';
    }
    return (
      'La partida termina y respondes ' + (faltan === 1 ? '1 pregunta' : faltan + ' preguntas') +
      ' seguidas, sin tablero, hasta completar ' + estado.partida.minimoPreguntas +
      '. Tu nota sale de todas las que respondas. Ir al examen?'
    );
  }

  function enlazar() {
    document.getElementById('ajedrez-ver-tutorial').addEventListener('click', abrirTutorial);
    document.getElementById('ajedrez-tutorial-abrir').addEventListener('click', abrirTutorial);
    document.getElementById('tut-cerrar').addEventListener('click', cerrarTutorial);
    document.getElementById('ajedrez-tutorial').addEventListener('click', function (evento) {
      if (evento.target === evento.currentTarget) cerrarTutorial();
    });
    document.getElementById('tut-anterior').addEventListener('click', function () {
      pasoTutorial = Math.max(0, pasoTutorial - 1);
      pintarTutorial();
    });
    document.getElementById('tut-siguiente').addEventListener('click', function () {
      if (pasoTutorial === M.PASOS_TUTORIAL.length - 1) {
        cerrarTutorial();
        return;
      }
      pasoTutorial++;
      pintarTutorial();
    });
    document.addEventListener('keydown', function (evento) {
      if (document.getElementById('ajedrez-tutorial').classList.contains('oculto')) return;
      if (evento.key === 'Escape') cerrarTutorial();
      if (evento.key === 'ArrowRight' && pasoTutorial < M.PASOS_TUTORIAL.length - 1) {
        pasoTutorial++;
        pintarTutorial();
      }
      if (evento.key === 'ArrowLeft' && pasoTutorial > 0) {
        pasoTutorial--;
        pintarTutorial();
      }
    });
    document.getElementById('ajedrez-examen').addEventListener('click', function () {
      if (estado && estado.etapa === 'jugando' && !estado.captura && window.confirm(textoTomarExamen())) {
        terminar('examen');
      }
    });
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
