/*
 * Runner Narrativo dentro del paquete SCORM.
 *
 * Intro -> pregunta -> video bueno -> pregunta siguiente ... Un error muestra
 * el video malo y termina la partida. Cada respuesta la verifica Ludus (que
 * recien ahi entrega el video), y la nota tambien sale de Ludus; el paquete
 * solo la reporta al LMS.
 *
 * Los videos se sirven desde Ludus, en otro dominio que el LMS: un <video>
 * los reproduce igual, sin permisos especiales.
 */
(function () {
  'use strict';

  var C;
  var estado = null;

  function el(id) {
    return C.elemento(id);
  }

  function mostrar(id, visible) {
    el(id).classList.toggle('oculto', !visible);
  }

  function pintarCamino() {
    var camino = el('runner-camino');
    camino.innerHTML = '';
    estado.preguntas.forEach(function (_, i) {
      var paso = document.createElement('span');
      var clase = 'runnerPaso';
      if (i < estado.indice || (i === estado.indice && estado.acerto === true)) clase += ' runnerPasoHecho';
      else if (i === estado.indice && estado.acerto === false) clase += ' runnerPasoFallado';
      else if (i === estado.indice) clase += ' runnerPasoActual';
      paso.className = clase;
      camino.appendChild(paso);
    });
  }

  /**
   * Reproduce un video y avisa al terminar. Sin video (el docente no lo subio)
   * o si no carga, muestra un cartel unos segundos y la historia sigue.
   */
  function reproducir(ruta, cartel, alTerminar) {
    var video = el('runner-video');
    el('runner-lienzo-texto').textContent = cartel;
    mostrar('runner-lienzo-nota', false);

    if (!ruta) {
      mostrar('runner-video', false);
      mostrar('runner-lienzo', true);
      setTimeout(alTerminar, 1600);
      return;
    }

    var listo = false;
    function terminar() {
      if (listo) return;
      listo = true;
      video.removeEventListener('ended', terminar);
      video.removeEventListener('error', fallar);
      alTerminar();
    }
    function fallar() {
      mostrar('runner-video', false);
      mostrar('runner-lienzo', true);
      mostrar('runner-lienzo-nota', true);
      setTimeout(terminar, 1600);
    }

    video.addEventListener('ended', terminar);
    video.addEventListener('error', fallar);
    video.src = C.urlArchivo(ruta);
    mostrar('runner-lienzo', false);
    mostrar('runner-video', true);
    var promesa = video.play();
    if (promesa && promesa.catch) promesa.catch(fallar);
  }

  function mostrarPregunta() {
    var pregunta = estado.preguntas[estado.indice];
    estado.acerto = null;
    pintarCamino();
    el('runner-numero').textContent = 'Pregunta ' + (estado.indice + 1) + ' de ' + estado.preguntas.length;
    el('runner-pregunta-texto').textContent = pregunta.texto;

    var opciones = el('runner-opciones');
    opciones.innerHTML = '';
    pregunta.opciones.forEach(function (opcion) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'runnerOpcion';
      boton.textContent = opcion.texto;
      boton.addEventListener('click', function () {
        responder(pregunta, opcion.id);
      });
      opciones.appendChild(boton);
    });
    mostrar('runner-pregunta', true);
  }

  function responder(pregunta, opcionId) {
    var botones = el('runner-opciones').querySelectorAll('button');
    for (var i = 0; i < botones.length; i++) botones[i].disabled = true;

    C.pedir('/runner/verificar', {
      metodo: 'POST',
      cuerpo: { preguntaId: pregunta.id, opcionId: opcionId },
    })
      .then(function (veredicto) {
        estado.respuestas.push({ preguntaId: pregunta.id, opcionId: opcionId });
        estado.acerto = veredicto.correcta;
        mostrar('runner-pregunta', false);
        pintarCamino();
        reproducir(veredicto.video, veredicto.correcta ? 'Correcto!' : 'Incorrecto', function () {
          if (veredicto.correcta && estado.indice < estado.preguntas.length - 1) {
            estado.indice += 1;
            mostrarPregunta();
          } else {
            terminar();
          }
        });
      })
      .catch(function (fallo) {
        C.mostrarError(fallo.message);
      });
  }

  function terminar() {
    C.pedir('/runner/terminar', { metodo: 'POST', cuerpo: { respuestas: estado.respuestas } })
      .then(function (resultado) {
        C.cerrarPartida(
          resultado,
          (resultado.completada ? 'Llegaste al final de la historia.' : 'La historia termino en la pregunta ' + (resultado.correctas + 1) + '.') +
            ' Respondiste bien ' + resultado.correctas + ' de ' + resultado.total + '.',
        );
      })
      .catch(function (fallo) {
        C.mostrarError(fallo.message);
      });
  }

  /** Un clic del estudiante: asi el navegador deja reproducir con sonido. */
  function comenzar() {
    mostrar('runner-portada', false);
    estado.indice = 0;
    estado.respuestas = [];
    pintarCamino();
    reproducir(estado.historia.videoIntro, estado.historia.nombre, mostrarPregunta);
  }

  function iniciar() {
    C = window.LudusComun;
    C.pedir('/partida')
      .then(function (partida) {
        var historia = partida.historia;
        estado = {
          historia: historia,
          preguntas: historia.preguntas,
          indice: 0,
          respuestas: [],
          acerto: null,
        };
        el('runner-titulo').textContent = partida.titulo;
        el('runner-estudiante').textContent = C.estudiante().nombre;
        el('runner-portada-titulo').textContent = historia.nombre;
        el('runner-portada-texto').textContent =
          partida.instrucciones ||
          'Mira la historia y responde cada pregunta. Si aciertas, sigues; si fallas, la historia termina.';
        el('runner-portada-dato').textContent =
          historia.preguntas.length + ' pregunta(s) · un error y se acaba';
        el('runner-lienzo-texto').textContent = '';
        el('runner-camino').innerHTML = '';
        mostrar('runner-video', false);
        mostrar('runner-lienzo', true);
        mostrar('runner-pregunta', false);
        mostrar('runner-portada', true);
        C.mostrarPantalla('pantalla-runner');
      })
      .catch(function (fallo) {
        C.mostrarError(fallo.message);
      });
  }

  function enlazar() {
    document.getElementById('runner-comenzar').addEventListener('click', comenzar);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enlazar);
  } else {
    enlazar();
  }

  window.LudusJuegos = window.LudusJuegos || {};
  window.LudusJuegos['runner-narrativo'] = { iniciar: iniciar };
})();
