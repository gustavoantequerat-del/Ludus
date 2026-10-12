<script setup lang="ts">
/**
 * Memorama: se voltean dos fichas por turno buscando parejas iguales.
 *
 * Se juega por rondas; cada ronda saca al azar los iconos del mazo y arma un
 * tablero nuevo. Es un juego ludico: no califica, y el puntaje solo mide que
 * tan pocos movimientos hicieron falta.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import estilos from './Memorama.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import { juegosServicio } from '@/servicios/juegos.servicio';
import { urlArchivo } from '@/utilidades/archivos';
import { formatearSegundos, guardarIntentoLudico } from '@/utilidades/partidas';
import { mezclar } from '@/utilidades/azar';
import { mensajeDeError } from '@/utilidades/errores';
import type { FinDePartida, PartidaMemorama } from '@/tipos';

const props = defineProps<{ moduloId: string }>();
const emit = defineEmits<{ terminada: [resultado: FinDePartida] }>();

interface Carta {
  id: number;
  icono: string;
  volteada: boolean;
  emparejada: boolean;
}

const partida = ref<PartidaMemorama | null>(null);
const error = ref('');
const estado = ref<'inicio' | 'jugando' | 'entreRondas' | 'terminado'>('inicio');
const ronda = ref(1);
const cartas = ref<Carta[]>([]);
const elegidas = ref<number[]>([]);
const bloqueado = ref(false);
const movimientos = ref(0);
const paresHallados = ref(0);
const segundos = ref(0);
const fin = ref<FinDePartida | null>(null);
let reloj: ReturnType<typeof setInterval> | null = null;
let espera: ReturnType<typeof setTimeout> | null = null;

const paresRonda = computed(() => cartas.value.filter((c) => c.emparejada).length / 2);
const totalPares = computed(() => (partida.value ? partida.value.rondas * partida.value.paresPorRonda : 0));
/** Columnas segun la cantidad de cartas, para que el tablero no quede largo. */
const columnas = computed(() => {
  const n = cartas.value.length;
  if (n <= 16) return 4;
  if (n <= 20) return 5;
  return 6;
});
const estiloMesa = computed(() => ({
  '--columnas': String(columnas.value),
  '--fondo-mesa': partida.value?.mazo.fondo ? `url("${urlArchivo(partida.value.mazo.fondo)}")` : 'none',
  '--dorso': partida.value?.mazo.imagenFicha ? `url("${urlArchivo(partida.value.mazo.imagenFicha)}")` : 'none',
  // El giro acompana a la velocidad elegida, sin pasar de medio segundo.
  '--giro': `${Math.min(450, (partida.value?.volteoMs ?? 1000) / 3)}ms`,
}));

function armarRonda() {
  if (!partida.value) return;
  const iconos = mezclar(partida.value.mazo.iconos).slice(0, partida.value.paresPorRonda);
  cartas.value = mezclar([...iconos, ...iconos]).map((icono, id) => ({
    id,
    icono,
    volteada: false,
    emparejada: false,
  }));
  elegidas.value = [];
  bloqueado.value = false;
}

function comenzar() {
  ronda.value = 1;
  movimientos.value = 0;
  paresHallados.value = 0;
  segundos.value = 0;
  fin.value = null;
  armarRonda();
  estado.value = 'jugando';
  detenerReloj();
  reloj = setInterval(() => (segundos.value += 1), 1000);
}

function voltear(carta: Carta) {
  if (estado.value !== 'jugando' || bloqueado.value || carta.volteada || carta.emparejada) return;
  carta.volteada = true;
  elegidas.value.push(carta.id);
  if (elegidas.value.length < 2) return;

  movimientos.value += 1;
  const [a, b] = elegidas.value.map((id) => cartas.value[id]);
  elegidas.value = [];
  if (a.icono === b.icono) {
    a.emparejada = true;
    b.emparejada = true;
    paresHallados.value += 1;
    if (cartas.value.every((c) => c.emparejada)) terminarRonda();
    return;
  }
  bloqueado.value = true;
  espera = setTimeout(() => {
    a.volteada = false;
    b.volteada = false;
    bloqueado.value = false;
  }, partida.value?.volteoMs ?? 1000);
}

function terminarRonda() {
  if (!partida.value) return;
  if (ronda.value < partida.value.rondas) {
    estado.value = 'entreRondas';
    return;
  }
  void terminar();
}

function siguienteRonda() {
  ronda.value += 1;
  armarRonda();
  estado.value = 'jugando';
}

/** 100 si cada pareja salio al primer intento; baja con cada intento de mas. */
async function terminar() {
  detenerReloj();
  estado.value = 'terminado';
  const puntaje = movimientos.value
    ? Math.round((100 * paresHallados.value) / movimientos.value)
    : 0;
  try {
    fin.value = await guardarIntentoLudico(props.moduloId, puntaje);
    emit('terminada', fin.value);
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo registrar la partida');
  }
}

function detenerReloj() {
  if (reloj) clearInterval(reloj);
  reloj = null;
}

onMounted(async () => {
  try {
    partida.value = await juegosServicio.partidaMemorama(props.moduloId);
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo cargar el juego');
  }
});

onBeforeUnmount(() => {
  detenerReloj();
  if (espera) clearTimeout(espera);
});
</script>

<template>
  <div :class="estilos.memorama" :style="estiloMesa">
    <p v-if="error" :class="estilos.error">{{ error }}</p>

    <template v-else-if="partida">
      <!-- Inicio -->
      <div v-if="estado === 'inicio'" :class="estilos.portada">
        <span :class="estilos.portadaIcono"><Icono nombre="layout-grid" :tamano="26" /></span>
        <h2 :class="estilos.portadaTitulo">{{ partida.titulo }}</h2>
        <p :class="estilos.portadaTexto">{{ partida.instrucciones || 'Voltea dos fichas por turno y encuentra todas las parejas.' }}</p>
        <div :class="estilos.datos">
          <span :class="estilos.dato"><Icono nombre="repeat" :tamano="14" />{{ partida.rondas }} ronda(s)</span>
          <span :class="estilos.dato"><Icono nombre="copy" :tamano="14" />{{ partida.paresPorRonda }} parejas por ronda</span>
          <span :class="estilos.dato"><Icono nombre="party-popper" :tamano="14" />Ludico: no califica</span>
        </div>
        <Boton variante="primario" icono="play" @click="comenzar">Comenzar</Boton>
      </div>

      <template v-else>
        <div :class="estilos.barra">
          <div :class="estilos.indicador">
            <span :class="estilos.indicadorEtiqueta">Ronda</span>
            <span :class="estilos.indicadorValor">{{ ronda }} de {{ partida.rondas }}</span>
          </div>
          <div :class="estilos.indicador">
            <span :class="estilos.indicadorEtiqueta">Parejas</span>
            <span :class="estilos.indicadorValor">{{ paresRonda }} / {{ partida.paresPorRonda }}</span>
          </div>
          <div :class="estilos.indicador">
            <span :class="estilos.indicadorEtiqueta">Movimientos</span>
            <span :class="estilos.indicadorValor">{{ movimientos }}</span>
          </div>
          <div :class="estilos.indicador">
            <span :class="estilos.indicadorEtiqueta">Tiempo</span>
            <span :class="estilos.indicadorValor">{{ formatearSegundos(segundos) }}</span>
          </div>
        </div>

        <div :class="estilos.mesa">
          <div :class="estilos.tablero">
            <button
              v-for="carta in cartas"
              :key="`${ronda}-${carta.id}`"
              type="button"
              :class="[
                estilos.carta,
                carta.volteada || carta.emparejada ? estilos.cartaVolteada : '',
                carta.emparejada ? estilos.cartaEmparejada : '',
              ]"
              :aria-label="carta.volteada || carta.emparejada ? 'Ficha descubierta' : 'Ficha tapada'"
              @click="voltear(carta)"
            >
              <span :class="estilos.cartaInterior">
                <span :class="[estilos.cara, estilos.dorso]">
                  <Icono v-if="!partida.mazo.imagenFicha" nombre="sparkles" :tamano="22" />
                </span>
                <span :class="[estilos.cara, estilos.frente]">
                  <img :class="estilos.iconoCarta" :src="urlArchivo(carta.icono)" alt="" draggable="false" />
                </span>
              </span>
            </button>
          </div>

          <!-- Entre rondas y final -->
          <div v-if="estado === 'entreRondas'" :class="estilos.aviso">
            <Icono nombre="party-popper" :tamano="26" />
            <h3 :class="estilos.avisoTitulo">Ronda {{ ronda }} superada</h3>
            <Boton variante="primario" icono="arrow-right" @click="siguienteRonda">Siguiente ronda</Boton>
          </div>
          <div v-if="estado === 'terminado'" :class="estilos.aviso">
            <Icono nombre="trophy" :tamano="28" />
            <h3 :class="estilos.avisoTitulo">Encontraste las {{ totalPares }} parejas</h3>
            <p :class="estilos.avisoTexto">
              {{ movimientos }} movimientos en {{ formatearSegundos(segundos) }}
              <template v-if="fin"> · puntaje {{ fin.puntaje }}</template>
            </p>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
