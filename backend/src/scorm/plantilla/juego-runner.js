/*
 * Runner Narrativo dentro del paquete SCORM.
 *
 * Intro -> pregunta -> video bueno -> pregunta siguiente ... Un error muestra
 * el video malo y termina la partida. Cada respuesta la verifica Ludus (que
 * recien ahi entrega el video), y la nota tambien sale de Ludus; el paquete
 * solo la reporta al LMS.
 *
 * Los videos estan en YouTube o en Google Drive (Ludus solo guarda el link).
 * Con YouTube se usa su API, que avisa cuando el video termina; Drive no
 * avisa nada, asi que el estudiante pulsa "Continuar". Si la API de YouTube
 * no carga, se usa el iframe simple con "Continuar".
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

  var cargaYoutube = null;

  function cargarApiYoutube() {
    if (cargaYoutube) return cargaYoutube;
    cargaYoutube = new Promise(function (resolver, rechazar) {
      if (window.YT && window.YT.Player) {
        resolver(window.YT);
        return;
      }
      var previo = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (previo) previo();
        resolver(window.YT);
      };
      var script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = function () {
        cargaYoutube = null;
        rechazar(new Error('No se pudo cargar YouTube'));
      };
      document.head.appendChild(script);
      setTimeout(function () {
        rechazar(new Error('YouTube no respondio'));
      }, 8000);
    });
    return cargaYoutube;
  }

  function urlInsercion(video) {
    return video.fuente === 'youtube'
      ? 'https://www.youtube-nocookie.com/embed/' + video.id + '?rel=0&playsinline=1&autoplay=1'
      : 'https://drive.google.com/file/d/' + video.id + '/preview';
  }

  /**
   * Muestra un video ({ fuente, id }) y avisa al terminar. Sin video (el
   * docente no puso link), un cartel unos segundos y la historia sigue.
   */
  function reproducir(video, cartel, alTerminar) {
    var marco = el('runner-marco');
    el('runner-lienzo-texto').textContent = cartel;

    if (!video) {
      mostrar('runner-video', false);
      setTimeout(alTerminar, 1600);
      return;
    }

    var listo = false;
    var reproductor = null;
    function terminar() {
      if (listo) return;
      listo = true;
      if (reproductor && reproductor.destroy) reproductor.destroy();
      marco.innerHTML = '';
      mostrar('runner-video', false);
      alTerminar();
    }
    function conBoton(texto) {
      marco.innerHTML = '';
      var iframe = document.createElement('iframe');
      iframe.src = urlInsercion(video);
      iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      iframe.setAttribute('allowfullscreen', '');
      iframe.title = 'Video de la historia';
      marco.appendChild(iframe);
      el('runner-video-ayuda').textContent = texto;
      mostrar('runner-video-pie', true);
    }

    el('runner-continuar').onclick = terminar;
    mostrar('runner-video-pie', false);
    mostrar('runner-video', true);

    if (video.fuente !== 'youtube') {
      conBoton('Dale play al video y, cuando termine, continua.');
      return;
    }
    marco.innerHTML = '<div></div>';
    cargarApiYoutube()
      .then(function (YT) {
        if (listo) return;
        reproductor = new YT.Player(marco.firstChild, {
          videoId: video.id,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
          events: {
            onReady: function (evento) {
              evento.target.playVideo();
            },
            onStateChange: function (evento) {
              if (evento.data === YT.PlayerState.ENDED) terminar();
            },
            onError: function () {
              if (reproductor && reproductor.destroy) reproductor.destroy();
              reproductor = null;
              conBoton('El video no se pudo reproducir.');
            },
          },
        });
      })
      .catch(function () {
        conBoton('Dale play al video y, cuando termine, continua.');
      });
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
        el('runner-marco').innerHTML = '';
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
