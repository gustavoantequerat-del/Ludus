/*
 * Lanzador del paquete SCORM de Ludus.
 *
 * Flujo: busca la API del LMS (SCORM 1.2) -> pide al estudiante que inicie
 * sesion con su cuenta de Ludus -> carga el juego que configuro el docente ->
 * al terminar guarda el resultado en Ludus y lo reporta al LMS.
 *
 * El paquete nunca lleva credenciales: el token del paquete solo identifica
 * que modulo abrir, y el acceso siempre lo da el login del estudiante.
 */
(function () {
  'use strict';

  var CONFIG = window.LUDUS_CONFIG || {};
  var UMBRAL_APROBACION = 60;

  var sesion = { token: null, estudiante: null };
  var paquete = null;
  var inicioDeSesion = Date.now();

  /* ------------------------------------------------------------------ *
   * API del LMS (SCORM 1.2)
   * ------------------------------------------------------------------ */

  var api = null;
  var apiIniciada = false;

  function buscarEnJerarquia(ventana) {
    var intentos = 0;
    try {
      while (!ventana.API && ventana.parent && ventana.parent !== ventana && intentos < 10) {
        intentos++;
        ventana = ventana.parent;
      }
      return ventana.API || null;
    } catch (error) {
      // Un LMS en otro dominio puede bloquear el acceso a window.parent.
      return null;
    }
  }

  function obtenerApi() {
    var encontrada = buscarEnJerarquia(window);
    if (!encontrada && window.opener) {
      encontrada = buscarEnJerarquia(window.opener);
    }
    return encontrada;
  }

  function iniciarScorm() {
    api = obtenerApi();
    if (!api) return false;
    try {
      apiIniciada = api.LMSInitialize('') === 'true';
    } catch (error) {
      apiIniciada = false;
    }
    return apiIniciada;
  }

  function escribirEnLms(clave, valor) {
    if (!apiIniciada) return;
    try {
      api.LMSSetValue(clave, String(valor));
    } catch (error) {
      /* si el LMS rechaza un elemento seguimos con el resto */
    }
  }

  function confirmarEnLms() {
    if (!apiIniciada) return;
    try {
      api.LMSCommit('');
    } catch (error) {
      /* sin efecto: el resultado ya quedo guardado en Ludus */
    }
  }

  /** SCORM 1.2 espera la sesion en formato HHHH:MM:SS.SS */
  function tiempoDeSesion() {
    var total = Math.max(0, Math.floor((Date.now() - inicioDeSesion) / 1000));
    var horas = Math.floor(total / 3600);
    var minutos = Math.floor((total % 3600) / 60);
    var segundos = total % 60;
    return (
      relleno(horas, 4) + ':' + relleno(minutos, 2) + ':' + relleno(segundos, 2) + '.00'
    );
  }

  function relleno(valor, largo) {
    var texto = String(valor);
    while (texto.length < largo) texto = '0' + texto;
    return texto;
  }

  function reportarResultadoAlLms(resultado) {
    if (!apiIniciada) return false;

    escribirEnLms('cmi.core.score.min', 0);
    escribirEnLms('cmi.core.score.max', resultado.puntajeMaximo);
    escribirEnLms('cmi.core.score.raw', resultado.puntaje);
    escribirEnLms('cmi.core.session_time', tiempoDeSesion());

    if (resultado.califica) {
      escribirEnLms(
        'cmi.core.lesson_status',
        resultado.puntaje >= UMBRAL_APROBACION ? 'passed' : 'failed',
      );
    } else {
      escribirEnLms('cmi.core.lesson_status', 'completed');
    }

    // Deja rastro de quien jugo, porque el usuario del LMS puede no ser el mismo
    // que la cuenta de Ludus con la que se registro el intento.
    escribirEnLms(
      'cmi.comments',
      'Ludus: ' +
        sesion.estudiante.nombre +
        ' (' +
        sesion.estudiante.correo +
        ') intento ' +
        resultado.intento,
    );

    confirmarEnLms();
    return true;
  }

  function cerrarScorm() {
    if (!apiIniciada) return;
    try {
      api.LMSFinish('');
    } catch (error) {
      /* nada que hacer si el LMS ya cerro la sesion */
    }
    apiIniciada = false;
  }

  /* ------------------------------------------------------------------ *
   * Llamadas a la API de Ludus
   * ------------------------------------------------------------------ */

  function urlDe(ruta) {
    return CONFIG.urlApi.replace(/\/$/, '') + '/scorm/publico/' + CONFIG.token + ruta;
  }

  function mensajeDeError(cuerpo, respaldo) {
    if (!cuerpo) return respaldo;
    if (Array.isArray(cuerpo.message)) return cuerpo.message[0];
    return cuerpo.message || respaldo;
  }

  function pedir(ruta, opciones) {
    opciones = opciones || {};
    var cabeceras = { 'Content-Type': 'application/json' };
    if (sesion.token) cabeceras.Authorization = 'Bearer ' + sesion.token;

    return fetch(urlDe(ruta), {
      method: opciones.metodo || 'GET',
      headers: cabeceras,
      body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
    }).then(function (respuesta) {
      return respuesta
        .json()
        .catch(function () {
          return null;
        })
        .then(function (cuerpo) {
          if (!respuesta.ok) {
            throw new Error(mensajeDeError(cuerpo, 'No se pudo conectar con Ludus'));
          }
          return cuerpo;
        });
    });
  }

  /* ------------------------------------------------------------------ *
   * Pantallas
   * ------------------------------------------------------------------ */

  function elemento(id) {
    return document.getElementById(id);
  }

  function mostrarPantalla(id) {
    var pantallas = document.querySelectorAll('.pantalla');
    for (var i = 0; i < pantallas.length; i++) {
      pantallas[i].classList.add('oculto');
    }
    elemento(id).classList.remove('oculto');
  }

  function mostrarError(mensaje) {
    elemento('error-mensaje').textContent = mensaje;
    mostrarPantalla('pantalla-error');
  }

  function dibujarTablero() {
    var tablero = elemento('tablero');
    tablero.innerHTML = '';
    var activas = [10, 11, 12, 20, 28];
    var objetivos = [5, 27, 33];
    for (var i = 0; i < 40; i++) {
      var celda = document.createElement('div');
      celda.className = 'celda';
      if (activas.indexOf(i) > -1) celda.className += ' celdaActiva';
      else if (objetivos.indexOf(i) > -1) celda.className += ' celdaObjetivo';
      tablero.appendChild(celda);
    }
  }

  function formatearTiempo(segundos) {
    var minutos = Math.floor(segundos / 60);
    var resto = segundos % 60;
    return minutos + ':' + relleno(resto, 2);
  }

  /* ------------------------------------------------------------------ *
   * Mesa de Cumplimiento (juego con mecanica real)
   * ------------------------------------------------------------------ */

  var OPCIONES_MESA = [
    { decision: 'aprobar', etiqueta: 'Aprobar', ayuda: 'Relacion con controles estandar' },
    {
      decision: 'reforzar',
      etiqueta: 'Aprobar con EDD',
      ayuda: 'Limites, condiciones y monitoreo reforzado',
    },
    { decision: 'rechazar', etiqueta: 'Rechazar', ayuda: 'El riesgo no es mitigable' },
  ];

  var mesa = { casos: [], indice: 0, respuestas: [], aciertos: 0, restante: 0, reloj: null };

  function etiquetaDecision(decision) {
    for (var i = 0; i < OPCIONES_MESA.length; i++) {
      if (OPCIONES_MESA[i].decision === decision) return OPCIONES_MESA[i].etiqueta;
    }
    return decision;
  }

  function iniciarMesa() {
    pedir('/partida')
      .then(function (datos) {
        mesa.casos = datos.casos;
        mesa.indice = 0;
        mesa.respuestas = [];
        mesa.aciertos = 0;
        mesa.restante = datos.tiempoLimiteSegundos;

        elemento('mesa-titulo').textContent = datos.titulo;
        elemento('mesa-instrucciones').textContent = datos.instrucciones;
        elemento('mesa-estudiante').textContent = sesion.estudiante.nombre;

        if (mesa.reloj) clearInterval(mesa.reloj);
        mesa.reloj = setInterval(function () {
          mesa.restante -= 1;
          pintarIndicadoresMesa();
          if (mesa.restante <= 0) terminarMesa();
        }, 1000);

        pintarCaso();
        mostrarPantalla('pantalla-mesa');
      })
      .catch(function (fallo) {
        mostrarError(fallo.message);
      });
  }

  function pintarIndicadoresMesa() {
    elemento('mesa-progreso').textContent =
      'Expediente ' + Math.min(mesa.indice + 1, mesa.casos.length) + ' de ' + mesa.casos.length;
    elemento('mesa-aciertos').textContent = 'Aciertos: ' + mesa.aciertos;
    elemento('mesa-tiempo').textContent = formatearTiempo(Math.max(0, mesa.restante));
  }

  function pintarCaso() {
    var caso = mesa.casos[mesa.indice];
    if (!caso) return;

    pintarIndicadoresMesa();
    elemento('mesa-entidad').textContent = caso.entidad;
    elemento('mesa-tipo').textContent = caso.tipo + ' · ' + caso.jurisdiccion;
    elemento('mesa-solicitud').textContent = caso.solicitud;

    var campos = elemento('mesa-campos');
    campos.innerHTML = '';
    caso.campos.forEach(function (campo) {
      var contenedor = document.createElement('div');
      contenedor.className = 'campo';
      var etiqueta = document.createElement('span');
      etiqueta.className = 'campoEtiqueta';
      etiqueta.textContent = campo.etiqueta;
      var valor = document.createElement('span');
      valor.className = 'campoValor';
      valor.textContent = campo.valor;
      contenedor.appendChild(etiqueta);
      contenedor.appendChild(valor);
      campos.appendChild(contenedor);
    });

    var decisiones = elemento('mesa-decisiones');
    decisiones.innerHTML = '';
    OPCIONES_MESA.forEach(function (opcion) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'botonDecision';
      var titulo = document.createElement('span');
      titulo.textContent = opcion.etiqueta;
      var ayuda = document.createElement('span');
      ayuda.className = 'botonDecisionAyuda';
      ayuda.textContent = opcion.ayuda;
      boton.appendChild(titulo);
      boton.appendChild(ayuda);
      boton.addEventListener('click', function () {
        decidirCaso(caso.id, opcion.decision);
      });
      decisiones.appendChild(boton);
    });

    decisiones.classList.remove('oculto');
    elemento('mesa-veredicto').classList.add('oculto');
  }

  function decidirCaso(casoId, decision) {
    elemento('mesa-decisiones').classList.add('oculto');
    mesa.respuestas.push({ casoId: casoId, decision: decision });

    pedir('/verificar', { metodo: 'POST', cuerpo: { casoId: casoId, decision: decision } })
      .then(function (veredicto) {
        if (veredicto.correcta) mesa.aciertos += 1;
        pintarIndicadoresMesa();

        var caja = elemento('mesa-veredicto');
        caja.className = 'veredicto ' + (veredicto.correcta ? 'veredictoCorrecto' : 'veredictoIncorrecto');
        elemento('mesa-veredicto-titulo').textContent = veredicto.correcta
          ? 'Decision correcta'
          : 'Revisa este criterio';
        elemento('mesa-veredicto-regla').textContent = veredicto.correcta
          ? veredicto.regla
          : 'Correspondia: ' + etiquetaDecision(veredicto.decisionCorrecta) + '. ' + veredicto.regla;
        elemento('mesa-veredicto-explicacion').textContent = veredicto.explicacion;
        elemento('mesa-veredicto-origen').textContent = veredicto.origen;
        elemento('mesa-siguiente').textContent =
          mesa.indice + 1 >= mesa.casos.length ? 'Terminar' : 'Siguiente expediente';
      })
      .catch(function (fallo) {
        mostrarError(fallo.message);
      });
  }

  function siguienteCaso() {
    if (mesa.indice + 1 >= mesa.casos.length) {
      terminarMesa();
      return;
    }
    mesa.indice += 1;
    pintarCaso();
  }

  function terminarMesa() {
    if (mesa.reloj) clearInterval(mesa.reloj);
    mesa.reloj = null;
    if (mesa.respuestas.length === 0) return;

    pedir('/partida', { metodo: 'POST', cuerpo: { respuestas: mesa.respuestas } })
      .then(function (datos) {
        var calificacion = datos.calificacion;
        elemento('repaso-puntaje').textContent = 'Puntaje: ' + calificacion.puntaje;
        elemento('repaso-aciertos').textContent =
          'Aciertos: ' + calificacion.aciertos + ' de ' + calificacion.total;
        elemento('repaso-exceso').textContent =
          'Rechazos sin sustento: ' + calificacion.erroresPorExceso;
        elemento('repaso-omision').textContent =
          'Riesgos que dejaste pasar: ' + calificacion.erroresPorOmision;
        elemento('repaso-nota').textContent = datos.nota
          ? 'Calificacion registrada en Ludus: ' + datos.nota
          : 'Modulo de practica: no genera calificacion';

        var detalle = elemento('repaso-detalle');
        detalle.innerHTML = '';
        calificacion.detalle.forEach(function (v) {
          var fila = document.createElement('div');
          fila.className = 'filaRepaso';
          var marca = document.createElement('span');
          marca.className = v.correcta ? 'marcaOk' : 'marcaMal';
          marca.textContent = v.correcta ? '✓' : '✕';
          var textos = document.createElement('div');
          textos.className = 'filaRepasoTextos';
          var entidad = document.createElement('span');
          entidad.className = 'filaRepasoEntidad';
          entidad.textContent = v.entidad;
          var detalleTexto = document.createElement('span');
          detalleTexto.className = 'filaRepasoDetalle';
          detalleTexto.textContent =
            'Decidiste ' +
            etiquetaDecision(v.decisionTomada) +
            ' · Correcto: ' +
            etiquetaDecision(v.decisionCorrecta) +
            ' — ' +
            v.regla;
          textos.appendChild(entidad);
          textos.appendChild(detalleTexto);
          fila.appendChild(marca);
          fila.appendChild(textos);
          detalle.appendChild(fila);
        });

        var reportado = reportarResultadoAlLms({
          puntaje: datos.puntaje,
          puntajeMaximo: datos.puntajeMaximo,
          califica: datos.califica,
          intento: datos.intento,
        });
        elemento('repaso-lms').textContent = reportado
          ? 'Resultado enviado al LMS.'
          : 'Sin LMS detectado: el resultado quedo guardado solo en Ludus.';

        mostrarPantalla('pantalla-repaso');
      })
      .catch(function (fallo) {
        mostrarError(fallo.message);
      });
  }

  function prepararJuego() {
    // Los juegos con mecanica programada tienen su propia pantalla.
    if (paquete.juego && paquete.juego.jugable) {
      iniciarMesa();
      return;
    }

    var configuracion = paquete.configuracion;

    elemento('juego-titulo').textContent = configuracion.titulo || paquete.modulo.titulo;
    elemento('juego-instrucciones').textContent =
      configuracion.instrucciones || paquete.juego.descripcion;
    elemento('chip-juego').textContent = paquete.juego.nombre;
    elemento('chip-tiempo').textContent = formatearTiempo(configuracion.tiempoLimiteSegundos);
    elemento('chip-intentos').textContent =
      'Hasta ' + configuracion.intentosPermitidos + ' intentos';
    elemento('juego-objetivo').textContent = 'Llegar a ' + configuracion.puntajeMaximo + ' puntos';
    elemento('chip-estudiante').textContent = sesion.estudiante.nombre;

    dibujarTablero();
    mostrarPantalla('pantalla-juego');
  }

  function mostrarResultado(resultado, reportado) {
    elemento('resultado-puntaje').textContent = resultado.puntaje;
    elemento('resultado-maximo').textContent = 'puntos de ' + resultado.puntajeMaximo;

    var porcentaje = Math.min(
      100,
      Math.round((resultado.puntaje / (resultado.puntajeMaximo || 100)) * 100),
    );
    elemento('resultado-barra').style.width = porcentaje + '%';

    var nota = elemento('resultado-nota');
    if (resultado.nota) {
      nota.textContent = 'Calificacion: ' + resultado.nota;
      nota.classList.remove('oculto');
    } else {
      nota.textContent = 'Modulo de practica: no genera calificacion';
      nota.classList.remove('oculto');
    }

    elemento('resultado-detalle').textContent =
      'Intento ' + resultado.intento + ' registrado en Ludus para ' + sesion.estudiante.nombre + '.';
    elemento('resultado-lms').textContent = reportado
      ? 'Resultado enviado al LMS.'
      : 'Sin LMS detectado: el resultado quedo guardado solo en Ludus.';

    mostrarPantalla('pantalla-resultado');
  }

  /* ------------------------------------------------------------------ *
   * Acciones
   * ------------------------------------------------------------------ */

  function alIngresar(evento) {
    evento.preventDefault();
    var boton = elemento('boton-ingresar');
    var error = elemento('login-error');
    error.classList.add('oculto');
    boton.disabled = true;
    boton.textContent = 'Ingresando...';

    pedir('/ingresar', {
      metodo: 'POST',
      cuerpo: {
        correo: elemento('campo-correo').value.trim(),
        clave: elemento('campo-clave').value,
      },
    })
      .then(function (datos) {
        sesion.token = datos.tokenAcceso;
        sesion.estudiante = datos.estudiante;
        paquete.configuracion = datos.configuracion;
        paquete.juego = datos.juego;
        elemento('campo-clave').value = '';
        inicioDeSesion = Date.now();
        prepararJuego();
      })
      .catch(function (fallo) {
        error.textContent = fallo.message;
        error.classList.remove('oculto');
      })
      .then(function () {
        boton.disabled = false;
        boton.textContent = 'Ingresar';
      });
  }

  function alTerminar() {
    var boton = elemento('boton-terminar');
    boton.disabled = true;
    boton.textContent = 'Guardando...';

    // Los juegos son maqueta por ahora: el puntaje se simula y lo que se
    // registra de verdad es el intento del estudiante.
    var puntaje = Math.floor(60 + Math.random() * 40);

    pedir('/resultado', { metodo: 'POST', cuerpo: { puntaje: puntaje } })
      .then(function (resultado) {
        var reportado = reportarResultadoAlLms(resultado);
        mostrarResultado(resultado, reportado);
      })
      .catch(function (fallo) {
        mostrarError(fallo.message);
      })
      .then(function () {
        boton.disabled = false;
        boton.textContent = 'Terminar';
      });
  }

  function alReintentar() {
    inicioDeSesion = Date.now();
    prepararJuego();
  }

  /* ------------------------------------------------------------------ *
   * Arranque
   * ------------------------------------------------------------------ */

  function iniciar() {
    if (!CONFIG.urlApi || !CONFIG.token) {
      mostrarError('El paquete no tiene configuracion valida.');
      return;
    }

    if (iniciarScorm()) {
      var estado = elemento('estado-lms');
      estado.textContent = 'Conectado al LMS';
      estado.classList.add('conectado');
      escribirEnLms('cmi.core.lesson_status', 'incomplete');
      confirmarEnLms();
    }

    elemento('formulario-login').addEventListener('submit', alIngresar);
    elemento('boton-terminar').addEventListener('click', alTerminar);
    elemento('boton-reintentar').addEventListener('click', alReintentar);
    elemento('mesa-siguiente').addEventListener('click', siguienteCaso);
    window.addEventListener('unload', cerrarScorm);

    pedir('')
      .then(function (datos) {
        paquete = datos;
        elemento('marca-sub').textContent = datos.curso.nombre;
        elemento('login-titulo').textContent = datos.modulo.titulo;
        elemento('login-subtitulo').textContent =
          'Entra con tu cuenta de Ludus para jugar y registrar tu avance en ' +
          datos.curso.nombre +
          '.';
        mostrarPantalla('pantalla-login');
      })
      .catch(function (fallo) {
        mostrarError(fallo.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
