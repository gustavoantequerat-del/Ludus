<script setup lang="ts">
/**
 * Runner Narrativo: una historia en video que avanza pregunta por pregunta.
 *
 * Intro -> pregunta 1 -> video bueno -> pregunta 2 -> ... -> meta. Un error
 * muestra el video malo y termina la partida. Cada respuesta la verifica el
 * servidor, que recien ahi entrega el video que corresponde; la nota tambien
 * se calcula alla. Los videos estan en YouTube o Google Drive (ver
 * ReproductorVideo).
 */
import { computed, onMounted, ref } from 'vue';
import estilos from './RunnerNarrativo.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import { juegosServicio } from '@/servicios/juegos.servicio';
import ReproductorVideo from './ReproductorVideo.vue';
import { mensajeDeError } from '@/utilidades/errores';
import type { FinDePartida, PartidaRunner, ResultadoRunner, VideoExterno } from '@/tipos';

const props = defineProps<{ moduloId: string }>();
const emit = defineEmits<{ terminada: [resultado: FinDePartida] }>();

type Etapa = 'inicio' | 'intro' | 'pregunta' | 'reaccion' | 'final';

const partida = ref<PartidaRunner | null>(null);
const error = ref('');
const etapa = ref<Etapa>('inicio');
const indice = ref(0);
const respuestas = ref<{ preguntaId: string; opcionId: string }[]>([]);
const acerto = ref<boolean | null>(null);
const enviando = ref(false);
const videoActual = ref<VideoExterno | null>(null);
/** Cada video monta un reproductor nuevo, aunque se repita el mismo link. */
const vuelta = ref(0);
const resultado = ref<ResultadoRunner | null>(null);
let alTerminarVideo: (() => void) | null = null;

const preguntas = computed(() => partida.value?.historia.preguntas ?? []);
const pregunta = computed(() => preguntas.value[indice.value] ?? null);
const gano = computed(() => acerto.value === true && indice.value >= preguntas.value.length - 1);

/**
 * Pone un video y espera a que termine (YouTube avisa solo; en Drive el
 * estudiante pulsa "Continuar"). Sin video, se muestra un cartel unos
 * segundos y la historia sigue igual.
 */
async function reproducir(video: VideoExterno | null): Promise<void> {
  if (!video) {
    await new Promise((resolver) => setTimeout(resolver, 1600));
    return;
  }
  vuelta.value += 1;
  videoActual.value = video;
  await new Promise<void>((resolver) => (alTerminarVideo = resolver));
  videoActual.value = null;
}

function videoTerminado() {
  alTerminarVideo?.();
  alTerminarVideo = null;
}

async function comenzar() {
  indice.value = 0;
  respuestas.value = [];
  acerto.value = null;
  resultado.value = null;
  etapa.value = 'intro';
  await reproducir(partida.value?.historia.videoIntro ?? null);
  etapa.value = 'pregunta';
}

async function responder(opcionId: string) {
  if (!pregunta.value || enviando.value) return;
  enviando.value = true;
  try {
    const veredicto = await juegosServicio.verificarRunner(props.moduloId, pregunta.value.id, opcionId);
    respuestas.value.push({ preguntaId: pregunta.value.id, opcionId });
    acerto.value = veredicto.correcta;
    etapa.value = 'reaccion';
    enviando.value = false;
    await reproducir(veredicto.video);
  } catch (fallo) {
    enviando.value = false;
    error.value = mensajeDeError(fallo, 'No se pudo verificar la respuesta');
    return;
  }

  if (acerto.value && indice.value < preguntas.value.length - 1) {
    indice.value += 1;
    acerto.value = null;
    etapa.value = 'pregunta';
    return;
  }
  await terminar();
}

async function terminar() {
  etapa.value = 'final';
  try {
    resultado.value = await juegosServicio.terminarRunner(props.moduloId, respuestas.value);
    emit('terminada', { puntaje: resultado.value.puntaje, nota: resultado.value.nota });
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo registrar la partida');
  }
}

onMounted(async () => {
  try {
    partida.value = await juegosServicio.partidaRunner(props.moduloId);
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo cargar la historia');
  }
});
</script>

<template>
  <div :class="estilos.runner">
    <p v-if="error" :class="estilos.error">{{ error }}</p>

    <template v-else-if="partida">
      <!-- Progreso: una marca por pregunta -->
      <div v-if="etapa !== 'inicio'" :class="estilos.camino">
        <span
          v-for="(p, i) in preguntas"
          :key="p.id"
          :class="[
            estilos.paso,
            i < indice || (i === indice && acerto === true) ? estilos.pasoHecho : '',
            i === indice && acerto === false ? estilos.pasoFallado : '',
            i === indice && acerto === null && etapa !== 'final' ? estilos.pasoActual : '',
          ]"
        />
      </div>

      <div :class="estilos.pantalla">
        <!-- El video ocupa la pantalla mientras dura; despues vuelve el lienzo. -->
        <ReproductorVideo v-if="videoActual" :key="vuelta" :video="videoActual" @terminado="videoTerminado" />
        <div v-else :class="[estilos.lienzo, acerto === true ? estilos.lienzoBueno : acerto === false ? estilos.lienzoMalo : '']">
          <template v-if="etapa === 'reaccion'">
            <Icono :nombre="acerto ? 'check-circle-2' : 'x-circle'" :tamano="44" />
            <span :class="estilos.lienzoTexto">{{ acerto ? 'Correcto!' : 'Incorrecto' }}</span>
          </template>
          <template v-else-if="etapa === 'intro'">
            <Icono nombre="clapperboard" :tamano="40" />
            <span :class="estilos.lienzoTexto">{{ partida.historia.nombre }}</span>
          </template>
        </div>

        <!-- Portada -->
        <div v-if="etapa === 'inicio'" :class="estilos.capa">
          <span :class="estilos.capaIcono"><Icono nombre="clapperboard" :tamano="28" /></span>
          <h2 :class="estilos.capaTitulo">{{ partida.titulo }}</h2>
          <p :class="estilos.capaTexto">
            {{ partida.instrucciones || 'Mira la historia y responde cada pregunta. Si aciertas, sigues; si fallas, la historia termina.' }}
          </p>
          <span :class="estilos.capaDato">{{ preguntas.length }} pregunta(s) · un error y se acaba</span>
          <Boton variante="primario" icono="play" @click="comenzar">Comenzar</Boton>
        </div>

        <!-- Pregunta -->
        <div v-if="etapa === 'pregunta' && pregunta" :class="[estilos.capa, estilos.capaPregunta]">
          <span :class="estilos.numero">Pregunta {{ indice + 1 }} de {{ preguntas.length }}</span>
          <h3 :class="estilos.pregunta">{{ pregunta.texto }}</h3>
          <div :class="estilos.opciones">
            <button
              v-for="opcion in pregunta.opciones"
              :key="opcion.id"
              type="button"
              :class="estilos.opcion"
              :disabled="enviando"
              @click="responder(opcion.id)"
            >
              {{ opcion.texto }}
            </button>
          </div>
        </div>

        <!-- Final -->
        <div v-if="etapa === 'final'" :class="estilos.capa">
          <span :class="[estilos.capaIcono, gano ? estilos.capaIconoBueno : estilos.capaIconoMalo]">
            <Icono :nombre="gano ? 'trophy' : 'flag'" :tamano="28" />
          </span>
          <h2 :class="estilos.capaTitulo">{{ gano ? 'Llegaste al final!' : 'La historia termino aqui' }}</h2>
          <template v-if="resultado">
            <p :class="estilos.capaTexto">
              Respondiste bien {{ resultado.correctas }} de {{ resultado.total }} pregunta(s).
            </p>
            <span :class="estilos.capaDato">
              Puntaje {{ resultado.puntaje }}{{ resultado.nota ? ` · calificacion ${resultado.nota}` : '' }}
            </span>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>
