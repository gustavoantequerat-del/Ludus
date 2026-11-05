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
import { ajedrezServicio } from '@/servicios/ajedrez.servicio';
import { mensajeDeError } from '@/utilidades/errores';
import { formatearSegundos } from '@/utilidades/partidas';
import {
  aplicar,
  casillaDelRey,
  enJaque,
  finalDe,
  jugadasDesde,
  nombreDe,
  notacion,
  posicionInicial,
  type Casilla,
  type Jugada,
  type Posicion,
  type TipoPieza,
} from '@/utilidades/ajedrez/motor';
import { elegirJugada } from '@/utilidades/ajedrez/bot';
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

const NOMBRE: Record<TipoPieza, string> = {
  p: 'peon', c: 'caballo', a: 'alfil', t: 'torre', d: 'dama', r: 'rey',
};

const partida = ref<PartidaAjedrez | null>(null);
const error = ref('');
const etapa = ref<Etapa>('inicio');
const pos = ref<Posicion>(posicionInicial());
const seleccion = ref<Casilla | null>(null);
const ultima = ref<{ desde: Casilla; hasta: Casilla } | null>(null);
const historial = ref<{ texto: string; marca: '' | 'bien' | 'mal' }[]>([]);
const piensa = ref(false);
const mensaje = ref('');
const respondidas = ref(0);
const correctas = ref(0);
const segundos = ref(0);
const tiempoAgotado = ref(false);
const confirmarRendicion = ref(false);
const cierre = ref<CierreAjedrez | null>(null);
const terminando = ref(false);

/** La captura que espera pregunta (en el tablero o en modo examen). */
interface Captura {
  jugada: Jugada | null;
  deEstudiante: boolean;
  modo: 'normal' | 'rey' | 'critica';
  contexto: string;
  aviso: string | null;
}
const captura = ref<Captura | null>(null);
/** Antes de una pregunta critica: el estudiante confirma (o elige otra jugada). */
const confirmarCritica = ref<Captura | null>(null);
const pregunta = ref<PreguntaAjedrezEnJuego | null>(null);
const resultado = ref<{ correcta: boolean; mensaje: string } | null>(null);
const enviando = ref(false);
let reloj: ReturnType<typeof setInterval> | null = null;

const destinos = computed(() =>
  seleccion.value === null ? [] : jugadasDesde(pos.value, seleccion.value),
);
const jaque = computed(() => {
  const turno = pos.value.turno;
  return enJaque(pos.value, turno) ? casillaDelRey(pos.value, turno) : null;
});
const bloqueado = computed(
  () => etapa.value !== 'jugando' || pos.value.turno !== 'b' || piensa.value || !!captura.value || !!confirmarCritica.value,
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
};

/* ---------------------------------------------------------------- *
 * Flujo de la partida
 * ---------------------------------------------------------------- */

async function comenzar() {
  if (!partida.value) return;
  pos.value = posicionInicial();
  etapa.value = 'jugando';
  mensaje.value = 'Tu turno: juegas con blancas.';
  reloj = setInterval(() => {
    segundos.value += 1;
    if (restante.value === 0 && !tiempoAgotado.value) {
      tiempoAgotado.value = true;
      // Si hay una pregunta abierta, se deja terminar; despues se cierra.
      if (!captura.value) void terminarPartida('tiempo');
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
  const atacado = `su ${NOMBRE[jugada.captura]} en ${nombreDe(jugada.casillaCaptura ?? jugada.hasta)}`;
  if (jugada.pieza === 'r') {
    confirmarCritica.value = {
      jugada,
      deEstudiante: true,
      modo: 'critica',
      contexto: `Tu rey ataca ${atacado}`,
      aviso: 'Pregunta critica: si fallas, pierdes la partida.',
    };
    return;
  }
  await abrirPregunta({
    jugada,
    deEstudiante: true,
    modo: 'normal',
    contexto: `Tu ${NOMBRE[jugada.pieza]} ataca ${atacado}`,
    aviso: null,
  });
}

async function aceptarCritica() {
  const datos = confirmarCritica.value;
  confirmarCritica.value = null;
  if (datos) await abrirPregunta(datos);
}

const enJuego = () => etapa.value === 'jugando' && !terminando.value;

async function turnoBot() {
  if (!enJuego() || revisarFinal()) return;
  piensa.value = true;
  mensaje.value = 'El bot esta pensando...';
  // Deja pintar el tablero antes de que el bot ocupe el navegador un momento.
  await new Promise((resolver) => setTimeout(resolver, 350));
  const jugada = elegirJugada(pos.value);
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
  const tuya = `tu ${NOMBRE[jugada.captura]} en ${nombreDe(jugada.casillaCaptura ?? jugada.hasta)}`;
  const esRey = jugada.pieza === 'r';
  mensaje.value = 'El bot ataca: responde para defender tu pieza.';
  await abrirPregunta({
    jugada,
    deEstudiante: false,
    modo: esRey ? 'rey' : 'normal',
    contexto: `${esRey ? 'El rey' : `Su ${NOMBRE[jugada.pieza]}`} ataca ${tuya}`,
    aviso: esRey ? 'Pregunta dificil: si aciertas, el rey enemigo cae y ganas la partida.' : null,
  });
}

/** Pide la pregunta al servidor y la muestra sobre el tablero. */
async function abrirPregunta(datos: Captura) {
  if (!partida.value) return;
  captura.value = datos;
  resultado.value = null;
  try {
    pregunta.value = await ajedrezServicio.pregunta(props.moduloId, partida.value.partidaId, datos.modo);
  } catch (fallo) {
    captura.value = null;
    // 409: el servidor dio el tiempo por terminado.
    if (axios.isAxiosError(fallo) && fallo.response?.status === 409) {
      await terminarPartida('tiempo');
      return;
    }
    error.value = mensajeDeError(fallo, 'No se pudo obtener la pregunta');
  }
}

async function responder(opcionId: string) {
  if (!partida.value || !pregunta.value || !captura.value || enviando.value) return;
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
    resultado.value = { correcta: veredicto.correcta, mensaje: mensajeResultado(captura.value, veredicto.correcta) };
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo enviar la respuesta');
  } finally {
    enviando.value = false;
  }
}

function mensajeResultado(datos: Captura, correcta: boolean): string {
  if (!datos.jugada) return correcta ? 'Correcto!' : 'Incorrecto.';
  const j = datos.jugada;
  if (datos.deEstudiante) {
    if (datos.modo === 'critica' && !correcta) return 'Incorrecto: tu rey cae y pierdes la partida.';
    return correcta
      ? `Correcto! Tu ${NOMBRE[j.pieza]} captura su ${NOMBRE[j.captura!]}.`
      : `Incorrecto: pierdes tu ${NOMBRE[j.pieza]} y su ${NOMBRE[j.captura!]} se queda.`;
  }
  if (datos.modo === 'rey' && correcta) return 'Correcto! El rey enemigo cae: ganaste la partida.';
  return correcta
    ? `Correcto! Tu ${NOMBRE[j.captura!]} sobrevive y cae su ${NOMBRE[j.pieza]}.`
    : `Incorrecto: pierdes tu ${NOMBRE[j.captura!]}.`;
}

/** Despues de ver el resultado: se aplica la captura y sigue la partida. */
async function continuar() {
  const datos = captura.value;
  const veredicto = resultado.value;
  captura.value = null;
  pregunta.value = null;
  resultado.value = null;
  if (!datos || !veredicto) return;

  if (etapa.value === 'examen') {
    await siguienteExamen();
    return;
  }

  const jugada = datos.jugada!;
  // Si responde bien, gana su pieza: si ataco, la captura sale; si defendia, el ataque falla.
  const exito = datos.deEstudiante ? veredicto.correcta : !veredicto.correcta;
  mover(jugada, exito, veredicto.correcta ? 'bien' : 'mal');

  if (datos.modo === 'critica' && !veredicto.correcta) {
    await terminarPartida('derrota');
    return;
  }
  if (datos.modo === 'rey' && veredicto.correcta) {
    await terminarPartida('victoria');
    return;
  }
  if (tiempoAgotado.value) {
    await terminarPartida('tiempo');
    return;
  }
  if (datos.deEstudiante) {
    await turnoBot();
  } else {
    mensaje.value = 'Tu turno.';
    revisarFinal();
  }
}

function mover(jugada: Jugada, exito: boolean, marca: '' | 'bien' | 'mal') {
  pos.value = aplicar(pos.value, jugada, exito);
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
  confirmarRendicion.value = false;
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
    jugada: null,
    deEstudiante: true,
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
        <li>Si tu rey captura, la pregunta es critica: fallarla te hace perder la partida.</li>
        <li>
          Tu nota es la parte de preguntas que respondas bien.
          <template v-if="partida.minutos"> Tienes {{ partida.minutos }} minuto(s).</template>
          Si te salen menos de {{ partida.minimoPreguntas }}, las que falten se responden en modo examen.
        </li>
      </ul>
      <Boton variante="primario" icono="play" @click="comenzar">Comenzar</Boton>
    </div>

    <!-- Partida -->
    <div v-else-if="partida && etapa === 'jugando'" :class="estilos.mesa">
      <div :class="estilos.zonaTablero">
        <Tablero
          :posicion="pos"
          :seleccion="seleccion"
          :destinos="destinos"
          :ultima="ultima"
          :jaque="jaque"
          :bloqueado="bloqueado"
          @elegir="elegirCasilla"
        />

        <!-- Pregunta sobre el tablero -->
        <div v-if="confirmarCritica || (captura && pregunta)" :class="estilos.velo">
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
            v-else-if="captura && pregunta"
            :pregunta="pregunta"
            :contexto="captura.contexto"
            :aviso="captura.aviso"
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
          <Icono v-if="piensa" nombre="loader-circle" :tamano="15" />{{ mensaje }}
        </p>
        <p v-if="jaque !== null && pos.turno === 'b'" :class="estilos.alertaJaque">Tu rey esta en jaque.</p>

        <div :class="estilos.historial">
          <span :class="estilos.historialTitulo">Jugadas</span>
          <ol :class="estilos.lista">
            <li v-for="(j, i) in historial" :key="i" :class="j.marca === 'bien' ? estilos.bien : j.marca === 'mal' ? estilos.mal : ''">
              {{ i % 2 === 0 ? 'Tu' : 'Bot' }}: {{ j.texto }}
            </li>
          </ol>
        </div>

        <div :class="estilos.rendirse">
          <template v-if="!confirmarRendicion">
            <Boton variante="fantasma" icono="flag" :deshabilitado="!!captura" @click="confirmarRendicion = true">
              Rendirse
            </Boton>
          </template>
          <template v-else>
            <span :class="estilos.rendirseTexto">Seguro? La nota sale de las preguntas que respondiste.</span>
            <Boton variante="secundario" @click="confirmarRendicion = false">No</Boton>
            <Boton variante="peligro" @click="terminarPartida('rendicion')">Si, rendirme</Boton>
          </template>
        </div>
      </aside>
    </div>

    <!-- Modo examen -->
    <div v-else-if="partida && etapa === 'examen'" :class="estilos.examen">
      <p :class="estilos.examenAviso">
        <Icono nombre="graduation-cap" :tamano="18" />
        {{ cierre?.desenlace ? textoDesenlace[cierre.desenlace] + '. ' : '' }}Te salieron menos de
        {{ partida.minimoPreguntas }} preguntas: responde las que faltan para calificar.
      </p>
      <TarjetaPregunta
        v-if="captura && pregunta"
        :pregunta="pregunta"
        :contexto="captura.contexto"
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
  </div>
</template>
