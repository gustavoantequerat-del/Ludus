<script setup lang="ts">
/**
 * Ajedrez de Preguntas: el estudiante (blancas) contra un bot intermedio.
 *
 * Es ajedrez normal, salvo que toda captura se decide con una pregunta del
 * banco. Si el estudiante acierta, su pieza sobrevive; si falla, la que muere
 * es la suya, haya atacado o defendido. Cuando captura un rey sale una
 * pregunta dificil: si es el rey del estudiante (critica) y falla, pierde la
 * partida; si es el rey del bot y el estudiante acierta, el rey del bot cae.
 *
 * El tablero y el bot corren aqui; las preguntas, la correccion, el tiempo y
 * la nota los lleva el servidor. Ganarle al bot solo termina la partida: la
 * nota es la parte de preguntas respondidas bien. Si salieron menos de X, se
 * completan en modo examen.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import estilos from './Ajedrez.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import Tablero from './ajedrez/Tablero.vue';
import TarjetaPregunta from './ajedrez/TarjetaPregunta.vue';
import TutorialAjedrez from './ajedrez/TutorialAjedrez.vue';
import { ajedrezServicio } from '@/servicios/ajedrez.servicio';
import { mensajeDeError } from '@/utilidades/errores';
import { formatearSegundos } from '@/utilidades/partidas';
import {
  aplicar,
  casillaDelRey,
  enJaque,
  finalDe,
  jugadasDesde,
  notacion,
  posicionInicial,
  type Casilla,
  type Jugada,
  type Posicion,
} from '@/utilidades/ajedrez/motor';
import { pensarJugada } from '@/utilidades/ajedrez/pensar';
import {
  capturaExitosa,
  describirCaptura,
  finalPorRey,
  textoResultado,
  type CapturaEnJuego,
  type ModoCaptura,
} from '@/utilidades/ajedrez/capturas';
import { moverPiezas, piezasDe, type PiezaEnTablero } from '@/utilidades/ajedrez/piezas-animadas';
import axios from 'axios';
import type {
  CierreAjedrez,
  DesenlaceAjedrez,
  FinDePartida,
  PartidaAjedrez,
  PreguntaAjedrezEnJuego,
} from '@/tipos';

const props = defineProps<{ moduloId: string }>();
const emit = defineEmits<{ terminada: [resultado: FinDePartida] }>();

type Etapa = 'inicio' | 'jugando' | 'examen' | 'final';

/** Lo que dura la animacion de una pieza que cae (Tablero.module.css). */
const DURACION_CAIDA_MS = 650;
/** Pausa minima del bot: si piensa mas rapido, igual se ve que "piensa". */
const PAUSA_BOT_MS = 450;

const partida = ref<PartidaAjedrez | null>(null);
const error = ref('');
const etapa = ref<Etapa>('inicio');
const pos = ref<Posicion>(posicionInicial());
const piezas = ref<PiezaEnTablero[]>(piezasDe(pos.value));
const caidas = ref<PiezaEnTablero[]>([]);
const destello = ref<{ casilla: Casilla; correcta: boolean; vuelta: number } | null>(null);
const seleccion = ref<Casilla | null>(null);
const ultima = ref<{ desde: Casilla; hasta: Casilla } | null>(null);
const historial = ref<{ texto: string; marca: '' | 'bien' | 'mal' }[]>([]);
const piensa = ref(false);
const mensaje = ref('');
const respondidas = ref(0);
const correctas = ref(0);
const segundos = ref(0);
const tiempoAgotado = ref(false);
/** Confirmacion abierta antes de terminar a pedido del estudiante. */
const confirmarFin = ref<'rendicion' | 'examen' | null>(null);
const verTutorial = ref(false);
const cierre = ref<CierreAjedrez | null>(null);
const terminando = ref(false);

/** La pregunta abierta: de una captura en el tablero o del modo examen (sin captura). */
interface PreguntaAbierta {
  captura: CapturaEnJuego | null;
  modo: ModoCaptura;
  contexto: string;
  aviso: string | null;
}
const abierta = ref<PreguntaAbierta | null>(null);
/** Antes de una pregunta critica propia: el estudiante confirma (o elige otra jugada). */
const confirmarCritica = ref<CapturaEnJuego | null>(null);
const pregunta = ref<PreguntaAjedrezEnJuego | null>(null);
const resultado = ref<{ correcta: boolean; mensaje: string } | null>(null);
const enviando = ref(false);
let reloj: ReturnType<typeof setInterval> | null = null;
let temporizadorCaidas: ReturnType<typeof setTimeout> | null = null;
let vueltaDestello = 0;

const destinos = computed(() =>
  seleccion.value === null ? [] : jugadasDesde(pos.value, seleccion.value),
);
const jaque = computed(() => {
  const turno = pos.value.turno;
  return enJaque(pos.value, turno) ? casillaDelRey(pos.value, turno) : null;
});
const bloqueado = computed(
  () => etapa.value !== 'jugando' || pos.value.turno !== 'b' || piensa.value || !!abierta.value || !!confirmarCritica.value,
);
const restante = computed(() =>
  partida.value?.minutos ? Math.max(0, partida.value.minutos * 60 - segundos.value) : null,
);
const textoDesenlace: Record<DesenlaceAjedrez, string> = {
  victoria: 'Le ganaste al bot',
  derrota: 'El bot gano la partida',
  tablas: 'La partida termino en tablas',
  tiempo: 'Se acabo el tiempo',
  rendicion: 'Te rendiste',
  examen: 'Elegiste tomar el examen',
};
/** Que pasa si el estudiante elige "Tomar examen" ahora. */
const textoTomarExamen = computed(() => {
  if (!partida.value) return '';
  const faltan = partida.value.minimoPreguntas - respondidas.value;
  if (faltan <= 0) {
    return `Ya respondiste ${respondidas.value} preguntas: la partida termina y se califica con lo que llevas.`;
  }
  return `La partida termina y respondes ${faltan === 1 ? '1 pregunta' : `${faltan} preguntas`} seguidas, sin tablero, hasta completar ${partida.value.minimoPreguntas}. Tu nota sale de todas las que respondas.`;
});
const avisoExamen = computed(() => {
  const minimo = partida.value?.minimoPreguntas ?? 0;
  if (cierre.value?.desenlace === 'examen') {
    return `Elegiste tomar el examen: responde las preguntas que faltan para completar ${minimo}.`;
  }
  const previo = cierre.value?.desenlace ? textoDesenlace[cierre.value.desenlace] + '. ' : '';
  return `${previo}Te salieron menos de ${minimo} preguntas: responde las que faltan para calificar.`;
});

/* ---------------------------------------------------------------- *
 * Flujo de la partida
 * ---------------------------------------------------------------- */

async function comenzar() {
  if (!partida.value) return;
  pos.value = posicionInicial();
  piezas.value = piezasDe(pos.value);
  etapa.value = 'jugando';
  mensaje.value = 'Tu turno: juegas con blancas.';
  reloj = setInterval(() => {
    segundos.value += 1;
    if (restante.value === 0 && !tiempoAgotado.value) {
      tiempoAgotado.value = true;
      // Si hay una pregunta abierta, se deja terminar; despues se cierra.
      if (!abierta.value) void terminarPartida('tiempo');
    }
  }, 1000);
}

function elegirCasilla(casilla: Casilla) {
  const pieza = pos.value.tablero[casilla];
  const jugada = destinos.value.find((j) => j.hasta === casilla);
  if (jugada) {
    seleccion.value = null;
    void jugarEstudiante(jugada);
    return;
  }
  seleccion.value = pieza && pieza.color === 'b' && seleccion.value !== casilla ? casilla : null;
}

async function jugarEstudiante(jugada: Jugada) {
  if (!jugada.captura) {
    mover(jugada, true, '');
    await turnoBot();
    return;
  }
  const captura = describirCaptura(jugada, true);
  if (captura.confirmar) {
    confirmarCritica.value = captura;
    return;
  }
  await abrirPregunta(desdeCaptura(captura));
}

function desdeCaptura(captura: CapturaEnJuego): PreguntaAbierta {
  return { captura, modo: captura.modo, contexto: captura.contexto, aviso: captura.aviso };
}

async function aceptarCritica() {
  const captura = confirmarCritica.value;
  confirmarCritica.value = null;
  if (captura) await abrirPregunta(desdeCaptura(captura));
}

const enJuego = () => etapa.value === 'jugando' && !terminando.value;

async function turnoBot() {
  if (!enJuego() || revisarFinal()) return;
  piensa.value = true;
  mensaje.value = 'El bot esta pensando';
  // El bot piensa en un Web Worker: la pagina no se congela mientras tanto.
  const [jugada] = await Promise.all([
    pensarJugada(pos.value),
    new Promise((resolver) => setTimeout(resolver, PAUSA_BOT_MS)),
  ]);
  piensa.value = false;
  if (!enJuego()) return;
  if (!jugada) {
    revisarFinal();
    return;
  }
  if (!jugada.captura) {
    mover(jugada, true, '');
    mensaje.value = `El bot jugo ${notacion(jugada)}. Tu turno.`;
    revisarFinal();
    return;
  }
  const captura = describirCaptura(jugada, false);
  // Se marca la jugada del bot antes de la pregunta: se ve que pieza ataca.
  ultima.value = { desde: jugada.desde, hasta: jugada.hasta };
  mensaje.value =
    captura.modo === 'critica'
      ? 'El bot ataca tu rey: responde bien para salvarlo.'
      : 'El bot ataca: responde para defender tu pieza.';
  await abrirPregunta(desdeCaptura(captura));
}

/** Pide la pregunta al servidor y la muestra sobre el tablero. */
async function abrirPregunta(datos: PreguntaAbierta) {
  if (!partida.value) return;
  abierta.value = datos;
  resultado.value = null;
  try {
    pregunta.value = await ajedrezServicio.pregunta(props.moduloId, partida.value.partidaId, datos.modo);
  } catch (fallo) {
    abierta.value = null;
    // 409: el servidor dio el tiempo por terminado.
    if (axios.isAxiosError(fallo) && fallo.response?.status === 409) {
      await terminarPartida('tiempo');
      return;
    }
    error.value = mensajeDeError(fallo, 'No se pudo obtener la pregunta');
  }
}

async function responder(opcionId: string) {
  if (!partida.value || !pregunta.value || !abierta.value || enviando.value) return;
  enviando.value = true;
  try {
    const veredicto = await ajedrezServicio.responder(
      props.moduloId,
      partida.value.partidaId,
      pregunta.value.preguntaId,
      opcionId,
    );
    respondidas.value = veredicto.respondidas;
    correctas.value = veredicto.correctas;
    const captura = abierta.value.captura;
    resultado.value = {
      correcta: veredicto.correcta,
      mensaje: captura
        ? textoResultado(captura, veredicto.correcta)
        : veredicto.correcta ? 'Correcto!' : 'Incorrecto.',
    };
  } catch (fallo) {
    // 409: el reloj termino mientras respondia; esa pregunta no cuenta.
    if (axios.isAxiosError(fallo) && fallo.response?.status === 409) {
      abierta.value = null;
      pregunta.value = null;
      await terminarPartida('tiempo');
      return;
    }
    error.value = mensajeDeError(fallo, 'No se pudo enviar la respuesta');
  } finally {
    enviando.value = false;
  }
}

/** Despues de ver el resultado: se aplica la captura y sigue la partida. */
async function continuar() {
  const datos = abierta.value;
  const veredicto = resultado.value;
  abierta.value = null;
  pregunta.value = null;
  resultado.value = null;
  if (!datos || !veredicto) return;

  if (etapa.value === 'examen' || !datos.captura) {
    await siguienteExamen();
    return;
  }

  const captura = datos.captura;
  const jugada = captura.jugada;
  mover(jugada, capturaExitosa(captura, veredicto.correcta), veredicto.correcta ? 'bien' : 'mal');
  destello.value = {
    casilla: jugada.casillaCaptura ?? jugada.hasta,
    correcta: veredicto.correcta,
    vuelta: ++vueltaDestello,
  };

  // Si cayo un rey, la partida termina; se deja ver la animacion antes.
  const porRey = finalPorRey(pos.value);
  if (porRey) {
    mensaje.value = porRey === 'victoria' ? 'Cayo el rey enemigo!' : 'Cayo tu rey.';
    await esperar(DURACION_CAIDA_MS);
    await terminarPartida(porRey);
    return;
  }
  if (tiempoAgotado.value) {
    await terminarPartida('tiempo');
    return;
  }
  if (captura.deEstudiante) {
    await turnoBot();
  } else {
    mensaje.value = 'Tu turno.';
    revisarFinal();
  }
}

function esperar(ms: number) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function mover(jugada: Jugada, exito: boolean, marca: '' | 'bien' | 'mal') {
  const nueva = aplicar(pos.value, jugada, exito);
  const cambio = moverPiezas(piezas.value, jugada, exito, nueva);
  pos.value = nueva;
  piezas.value = cambio.piezas;
  if (cambio.caidas.length) {
    caidas.value = cambio.caidas;
    if (temporizadorCaidas) clearTimeout(temporizadorCaidas);
    temporizadorCaidas = setTimeout(() => (caidas.value = []), DURACION_CAIDA_MS);
  }
  ultima.value = { desde: jugada.desde, hasta: jugada.hasta };
  historial.value.push({ texto: notacion(jugada) + (jugada.captura && !exito ? ' (fallo)' : ''), marca });
}

/** Mate, ahogado o falta de material para quien tiene el turno. */
function revisarFinal(): boolean {
  const final = finalDe(pos.value);
  if (!final) return false;
  if (final === 'mate') void terminarPartida(pos.value.turno === 'n' ? 'victoria' : 'derrota');
  else void terminarPartida('tablas');
  return true;
}

async function terminarPartida(desenlace: DesenlaceAjedrez) {
  if (!partida.value || terminando.value || etapa.value === 'final') return;
  terminando.value = true;
  if (reloj) clearInterval(reloj);
  reloj = null;
  confirmarFin.value = null;
  confirmarCritica.value = null;
  try {
    cierre.value = await ajedrezServicio.terminar(props.moduloId, partida.value.partidaId, desenlace);
    if (cierre.value.examen) {
      etapa.value = 'examen';
      await siguienteExamen();
    } else {
      cerrar();
    }
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo terminar la partida');
  } finally {
    terminando.value = false;
  }
}

/** Modo examen: preguntas sueltas hasta llegar al minimo X; despues se califica. */
async function siguienteExamen() {
  if (!partida.value) return;
  if (respondidas.value >= partida.value.minimoPreguntas) {
    cierre.value = await ajedrezServicio.terminar(props.moduloId, partida.value.partidaId, cierre.value?.desenlace ?? 'tiempo');
    cerrar();
    return;
  }
  const faltan = partida.value.minimoPreguntas - respondidas.value;
  await abrirPregunta({
    captura: null,
    modo: 'normal',
    contexto: `Modo examen: ${faltan === 1 ? 'falta 1 pregunta' : `faltan ${faltan} preguntas`}`,
    aviso: null,
  });
}

function cerrar() {
  etapa.value = 'final';
  if (cierre.value && cierre.value.puntaje !== null && cierre.value.puntaje !== undefined) {
    emit('terminada', { puntaje: cierre.value.puntaje, nota: cierre.value.nota ?? null });
  }
}

onMounted(async () => {
  try {
    partida.value = await ajedrezServicio.iniciar(props.moduloId);
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo preparar la partida');
  }
});

onBeforeUnmount(() => {
  if (reloj) clearInterval(reloj);
  if (temporizadorCaidas) clearTimeout(temporizadorCaidas);
});
</script>

<template>
  <div :class="estilos.ajedrez">
    <p v-if="error" :class="estilos.error">{{ error }}</p>

    <!-- Portada -->
    <div v-else-if="partida && etapa === 'inicio'" :class="estilos.portada">
      <span :class="estilos.portadaIcono"><Icono nombre="crown" :tamano="30" /></span>
      <h2 :class="estilos.portadaTitulo">{{ partida.titulo }}</h2>
      <p v-if="partida.instrucciones" :class="estilos.portadaTexto">{{ partida.instrucciones }}</p>
      <ul :class="estilos.reglas">
        <li>Juegas con blancas contra el bot. Para terminar, dale jaque mate.</li>
        <li>Cada vez que dos piezas chocan sale una pregunta: si aciertas, tu pieza sobrevive; si fallas, la comida es la tuya, aunque hayas atacado tu.</li>
        <li>Valen el enroque, la captura al paso y la coronacion. Si estas en jaque, solo puedes jugar para salir de el.</li>
        <li>Si tu rey captura, o el bot ataca a tu rey, la pregunta es critica: fallarla te hace perder la partida.</li>
        <li>Si una captura fallida deja al rey enemigo expuesto, puedes atacarlo: si aciertas la pregunta, lo capturas y ganas.</li>
        <li>
          Tu nota es la parte de preguntas que respondas bien.
          <template v-if="partida.minutos"> Tienes {{ partida.minutos }} minuto(s).</template>
          Si te salen menos de {{ partida.minimoPreguntas }}, las que falten se responden en modo examen.
        </li>
      </ul>
      <div :class="estilos.portadaAcciones">
        <Boton icono="graduation-cap" @click="verTutorial = true">No se jugar: ver tutorial</Boton>
        <Boton variante="primario" icono="play" @click="comenzar">Comenzar</Boton>
      </div>
    </div>

    <!-- Partida -->
    <div v-else-if="partida && etapa === 'jugando'" :class="estilos.mesa">
      <div :class="estilos.zonaTablero">
        <Tablero
          :piezas="piezas"
          :caidas="caidas"
          :destello="destello"
          :seleccion="seleccion"
          :destinos="destinos"
          :ultima="ultima"
          :jaque="jaque"
          :bloqueado="bloqueado"
          @elegir="elegirCasilla"
        />

        <!-- Pregunta sobre el tablero -->
        <div v-if="confirmarCritica || (abierta && pregunta)" :class="estilos.velo">
          <div v-if="confirmarCritica" :class="estilos.critica">
            <span :class="estilos.criticaIcono"><Icono nombre="shield-alert" :tamano="26" /></span>
            <h3 :class="estilos.criticaTitulo">Pregunta critica</h3>
            <p :class="estilos.criticaTexto">
              {{ confirmarCritica.contexto }}. Si respondes mal, tu rey cae y pierdes la partida.
            </p>
            <div :class="estilos.criticaAcciones">
              <Boton variante="secundario" @click="confirmarCritica = null">Elegir otra jugada</Boton>
              <Boton variante="peligro" icono="swords" @click="aceptarCritica">Responder</Boton>
            </div>
          </div>
          <TarjetaPregunta
            v-else-if="abierta && pregunta"
            :pregunta="pregunta"
            :contexto="abierta.contexto"
            :aviso="abierta.aviso"
            :resultado="resultado"
            :enviando="enviando"
            @responder="responder"
            @continuar="continuar"
          />
        </div>
      </div>

      <aside :class="estilos.panel">
        <div :class="estilos.indicadores">
          <span v-if="restante !== null" :class="[estilos.chip, restante <= 60 ? estilos.chipAlerta : '']">
            <Icono nombre="timer" :tamano="14" />{{ formatearSegundos(restante) }}
          </span>
          <span :class="estilos.chip">
            <Icono nombre="circle-check" :tamano="14" />{{ correctas }} de {{ respondidas }} bien
          </span>
          <span :class="estilos.chip">
            <Icono nombre="list-checks" :tamano="14" />minimo {{ partida.minimoPreguntas }}
          </span>
        </div>
        <p :class="estilos.mensaje">
          <Icono v-if="piensa" nombre="cpu" :tamano="15" />{{ mensaje }}<span v-if="piensa" :class="estilos.puntos" aria-hidden="true"><i /><i /><i /></span>
        </p>
        <Transition :enter-from-class="estilos.alertaEntra" :leave-to-class="estilos.alertaEntra">
          <p v-if="jaque !== null && pos.turno === 'b' && !abierta" :class="estilos.alertaJaque">
            <Icono nombre="shield-alert" :tamano="15" />Jaque: tu rey esta atacado. Sacalo del jaque.
          </p>
        </Transition>

        <div :class="estilos.historial">
          <span :class="estilos.historialTitulo">Jugadas</span>
          <ol :class="estilos.lista">
            <li v-for="(j, i) in historial" :key="i" :class="j.marca === 'bien' ? estilos.bien : j.marca === 'mal' ? estilos.mal : ''">
              {{ i % 2 === 0 ? 'Tu' : 'Bot' }}: {{ j.texto }}
            </li>
          </ol>
        </div>

        <div :class="estilos.rendirse">
          <template v-if="!confirmarFin">
            <Boton variante="fantasma" icono="book-open" @click="verTutorial = true">Como se mueven</Boton>
            <Boton icono="graduation-cap" :deshabilitado="!!abierta" @click="confirmarFin = 'examen'">
              Tomar examen
            </Boton>
            <Boton variante="fantasma" icono="flag" :deshabilitado="!!abierta" @click="confirmarFin = 'rendicion'">
              Rendirse
            </Boton>
          </template>
          <template v-else-if="confirmarFin === 'examen'">
            <span :class="estilos.rendirseTexto">{{ textoTomarExamen }}</span>
            <Boton variante="secundario" @click="confirmarFin = null">Seguir jugando</Boton>
            <Boton variante="primario" icono="graduation-cap" @click="terminarPartida('examen')">Ir al examen</Boton>
          </template>
          <template v-else>
            <span :class="estilos.rendirseTexto">Seguro? La nota sale de las preguntas que respondiste.</span>
            <Boton variante="secundario" @click="confirmarFin = null">No</Boton>
            <Boton variante="peligro" @click="terminarPartida('rendicion')">Si, rendirme</Boton>
          </template>
        </div>
      </aside>
    </div>

    <!-- Modo examen -->
    <div v-else-if="partida && etapa === 'examen'" :class="estilos.examen">
      <p :class="estilos.examenAviso">
        <Icono nombre="graduation-cap" :tamano="18" />
        {{ avisoExamen }}
      </p>
      <TarjetaPregunta
        v-if="abierta && pregunta"
        :pregunta="pregunta"
        :contexto="abierta.contexto"
        :resultado="resultado"
        :enviando="enviando"
        @responder="responder"
        @continuar="continuar"
      />
    </div>

    <!-- Final -->
    <div v-else-if="partida && etapa === 'final' && cierre" :class="estilos.portada">
      <span :class="[estilos.portadaIcono, cierre.desenlace === 'victoria' ? estilos.iconoBueno : '']">
        <Icono :nombre="cierre.desenlace === 'victoria' ? 'trophy' : 'flag'" :tamano="30" />
      </span>
      <h2 :class="estilos.portadaTitulo">{{ cierre.desenlace ? textoDesenlace[cierre.desenlace] : 'Partida terminada' }}</h2>
      <p :class="estilos.portadaTexto">
        Respondiste bien {{ cierre.correctas }} de {{ cierre.respondidas }} pregunta(s)<template v-if="cierre.enExamen">
          ({{ cierre.enExamen }} en modo examen)</template>.
      </p>
      <span :class="estilos.dato">
        Puntaje {{ cierre.puntaje }}{{ cierre.nota ? ` · calificacion ${cierre.nota}` : '' }}
      </span>
    </div>

    <TutorialAjedrez
      v-if="verTutorial"
      :cierre="etapa === 'inicio' ? 'Listo, a jugar' : 'Volver a la partida'"
      @cerrar="verTutorial = false"
    />
  </div>
</template>
