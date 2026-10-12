<script setup lang="ts">
/**
 * Mahjong solitario: se retiran de a dos las fichas libres con el mismo icono
 * hasta vaciar el tablero. Ludico: no califica; el puntaje es la parte del
 * tablero que se vacio, con un pequeno descuento por cada barajada.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import estilos from './Mahjong.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import { juegosServicio } from '@/servicios/juegos.servicio';
import { urlArchivo } from '@/utilidades/archivos';
import { formatearSegundos, guardarIntentoLudico } from '@/utilidades/partidas';
import { mensajeDeError } from '@/utilidades/errores';
import { DISPOSICIONES, barajar, estaLibre, generar, pista, type Ficha } from './mahjong/tablero';
import type { FinDePartida, PartidaMahjong } from '@/tipos';

const props = defineProps<{ moduloId: string }>();
const emit = defineEmits<{ terminada: [resultado: FinDePartida] }>();

const partida = ref<PartidaMahjong | null>(null);
const error = ref('');
const estado = ref<'inicio' | 'jugando' | 'terminado'>('inicio');
const fichas = ref<Ficha[]>([]);
const seleccionada = ref<number | null>(null);
const resaltadas = ref<number[]>([]);
const sacudida = ref<number | null>(null);
const barajadas = ref(0);
const segundos = ref(0);
const fin = ref<FinDePartida | null>(null);
/** Lo que queda en la mesa no tiene salida ni barajando. */
const trabado = ref(false);
const contenedor = ref<HTMLElement | null>(null);
const anchoDisponible = ref(800);
let reloj: ReturnType<typeof setInterval> | null = null;
let observador: ResizeObserver | null = null;

const disposicion = computed(() => DISPOSICIONES[partida.value?.tamano ?? 'mediano']);
const quedan = computed(() => fichas.value.filter((f) => !f.retirada));
const libres = computed(() => new Set(quedan.value.filter((f) => estaLibre(f, fichas.value)).map((f) => f.id)));
const sinJugadas = computed(() => estado.value === 'jugando' && quedan.value.length > 0 && !pista(fichas.value));
const capas = computed(() => disposicion.value.capas.length);

/** Tamano de ficha segun el ancho disponible: el tablero entra entero en pantalla. */
const estiloTablero = computed(() => {
  const columnas = disposicion.value.ancho + 0.6;
  const ancho = Math.max(26, Math.min(70, (anchoDisponible.value - 40) / columnas));
  return {
    '--w': `${ancho}px`,
    '--h': `${ancho * 1.28}px`,
    '--d': `${ancho * 0.09}px`,
    '--columnas': String(disposicion.value.ancho),
    '--filas': String(disposicion.value.alto),
    '--capas': String(capas.value),
    '--cuerpo': partida.value?.mazo.imagenFicha ? `url("${urlArchivo(partida.value.mazo.imagenFicha)}")` : 'none',
  };
});
const estiloMesa = computed(() => ({
  '--fondo-mesa': partida.value?.mazo.fondo ? `url("${urlArchivo(partida.value.mazo.fondo)}")` : 'none',
}));

function estiloFicha(ficha: Ficha) {
  return {
    '--x': String(ficha.x),
    '--y': String(ficha.y),
    '--z': String(ficha.z),
    zIndex: String(ficha.z * 1000 + ficha.y * 30 + ficha.x),
  };
}

function comenzar() {
  if (!partida.value) return;
  fichas.value = generar(partida.value.tamano, partida.value.mazo.iconos);
  seleccionada.value = null;
  resaltadas.value = [];
  barajadas.value = 0;
  segundos.value = 0;
  fin.value = null;
  trabado.value = false;
  estado.value = 'jugando';
  if (reloj) clearInterval(reloj);
  reloj = setInterval(() => (segundos.value += 1), 1000);
}

function tocar(ficha: Ficha) {
  if (estado.value !== 'jugando' || ficha.retirada) return;
  resaltadas.value = [];
  if (!libres.value.has(ficha.id)) {
    // Una ficha tapada se sacude: asi se entiende que no esta libre.
    sacudida.value = ficha.id;
    setTimeout(() => (sacudida.value = null), 350);
    return;
  }
  if (seleccionada.value === ficha.id) {
    seleccionada.value = null;
    return;
  }
  const otra = fichas.value.find((f) => f.id === seleccionada.value);
  if (otra && otra.icono === ficha.icono) {
    otra.retirada = true;
    ficha.retirada = true;
    seleccionada.value = null;
    if (quedan.value.length === 0) void terminar();
    return;
  }
  seleccionada.value = ficha.id;
}

function mostrarPista() {
  const par = pista(fichas.value);
  resaltadas.value = par ? par.map((f) => f.id) : [];
}

function rebarajar() {
  const nuevas = barajar(fichas.value);
  if (!nuevas) {
    trabado.value = true;
    return;
  }
  fichas.value = nuevas;
  barajadas.value += 1;
  seleccionada.value = null;
  resaltadas.value = [];
}

async function terminar() {
  if (reloj) clearInterval(reloj);
  reloj = null;
  estado.value = 'terminado';
  const total = fichas.value.length;
  const retiradas = total - quedan.value.length;
  const puntaje = Math.max(0, Math.round((100 * retiradas) / total) - barajadas.value * 5);
  try {
    fin.value = await guardarIntentoLudico(props.moduloId, puntaje);
    emit('terminada', fin.value);
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo registrar la partida');
  }
}

onMounted(async () => {
  try {
    partida.value = await juegosServicio.partidaMahjong(props.moduloId);
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo cargar el juego');
  }
  observador = new ResizeObserver(([entrada]) => {
    anchoDisponible.value = entrada.contentRect.width;
  });
  if (contenedor.value) observador.observe(contenedor.value);
});

onBeforeUnmount(() => {
  if (reloj) clearInterval(reloj);
  observador?.disconnect();
});
</script>

<template>
  <div ref="contenedor" :class="estilos.mahjong">
    <p v-if="error" :class="estilos.error">{{ error }}</p>

    <template v-else-if="partida">
      <div v-if="estado === 'inicio'" :class="estilos.portada">
        <span :class="estilos.portadaIcono"><Icono nombre="layers" :tamano="26" /></span>
        <h2 :class="estilos.portadaTitulo">{{ partida.titulo }}</h2>
        <p :class="estilos.portadaTexto">
          {{ partida.instrucciones || 'Retira de a dos las fichas libres con el mismo icono hasta vaciar el tablero.' }}
        </p>
        <p :class="estilos.portadaRegla">
          Una ficha esta libre si no tiene otra encima y le queda un costado (izquierdo o derecho) sin tapar.
        </p>
        <Boton variante="primario" icono="play" @click="comenzar">Comenzar</Boton>
      </div>

      <template v-else>
        <div :class="estilos.barra">
          <div :class="estilos.indicador">
            <span :class="estilos.indicadorEtiqueta">Fichas</span>
            <span :class="estilos.indicadorValor">{{ quedan.length }}</span>
          </div>
          <div :class="estilos.indicador">
            <span :class="estilos.indicadorEtiqueta">Barajadas</span>
            <span :class="estilos.indicadorValor">{{ barajadas }}</span>
          </div>
          <div :class="estilos.indicador">
            <span :class="estilos.indicadorEtiqueta">Tiempo</span>
            <span :class="estilos.indicadorValor">{{ formatearSegundos(segundos) }}</span>
          </div>
          <span :class="estilos.espaciador" />
          <template v-if="estado === 'jugando'">
            <Boton icono="lightbulb" @click="mostrarPista">Pista</Boton>
            <Boton icono="shuffle" @click="rebarajar">Barajar</Boton>
            <Boton variante="fantasma" icono="flag" @click="terminar">Terminar</Boton>
          </template>
        </div>

        <div :class="estilos.mesa" :style="estiloMesa">
          <div :class="estilos.tablero" :style="estiloTablero">
            <button
              v-for="ficha in quedan"
              :key="ficha.id"
              type="button"
              :class="[
                estilos.ficha,
                libres.has(ficha.id) ? estilos.fichaLibre : estilos.fichaTapada,
                seleccionada === ficha.id ? estilos.fichaSeleccionada : '',
                resaltadas.includes(ficha.id) ? estilos.fichaPista : '',
                sacudida === ficha.id ? estilos.fichaSacudida : '',
              ]"
              :style="estiloFicha(ficha)"
              @click="tocar(ficha)"
            >
              <img :class="estilos.icono" :src="urlArchivo(ficha.icono)" alt="" draggable="false" />
            </button>
          </div>

          <div v-if="estado === 'jugando' && trabado" :class="estilos.aviso">
            <Icono nombre="lock" :tamano="26" />
            <h3 :class="estilos.avisoTitulo">El tablero quedo trabado</h3>
            <p :class="estilos.avisoTexto">
              Las fichas que quedan estan apiladas de forma que ningun reparto las libera.
            </p>
            <Boton variante="primario" icono="flag" @click="terminar">Terminar partida</Boton>
          </div>
          <div v-else-if="sinJugadas" :class="estilos.aviso">
            <Icono nombre="shuffle" :tamano="26" />
            <h3 :class="estilos.avisoTitulo">No quedan parejas libres</h3>
            <p :class="estilos.avisoTexto">Baraja las fichas que quedan para seguir jugando.</p>
            <Boton variante="primario" icono="shuffle" @click="rebarajar">Barajar</Boton>
          </div>
          <div v-if="estado === 'terminado'" :class="estilos.aviso">
            <Icono :nombre="quedan.length === 0 ? 'trophy' : 'flag'" :tamano="28" />
            <h3 :class="estilos.avisoTitulo">
              {{ quedan.length === 0 ? 'Tablero vacio!' : `Retiraste ${fichas.length - quedan.length} de ${fichas.length} fichas` }}
            </h3>
            <p :class="estilos.avisoTexto">
              {{ formatearSegundos(segundos) }} · {{ barajadas }} barajada(s)
              <template v-if="fin"> · puntaje {{ fin.puntaje }}</template>
            </p>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
