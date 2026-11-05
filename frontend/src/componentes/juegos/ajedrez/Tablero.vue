<script setup lang="ts">
/**
 * Tablero visto desde las blancas (el estudiante).
 *
 * Dos capas: las casillas (botones, reciben los clics) y encima las piezas,
 * cada una con su id, posicionadas con transform. Al cambiar de casilla la
 * pieza se desliza; las que caen salen con su propia animacion.
 */
import { computed } from 'vue';
import estilos from './Tablero.module.css';
import PiezaAjedrez from './PiezaAjedrez.vue';
import { columna, fila, nombreDe, type Casilla, type Jugada } from '@/utilidades/ajedrez/motor';
import type { PiezaEnTablero } from '@/utilidades/ajedrez/piezas-animadas';

const props = defineProps<{
  piezas: PiezaEnTablero[];
  /** Piezas que acaban de caer: se dibujan un momento con la animacion de salida. */
  caidas: PiezaEnTablero[];
  seleccion: Casilla | null;
  destinos: Jugada[];
  ultima: { desde: Casilla; hasta: Casilla } | null;
  /** Casilla del rey en jaque, para marcarla. */
  jaque: Casilla | null;
  /** Destello sobre una casilla al resolver una pregunta. */
  destello: { casilla: Casilla; correcta: boolean; vuelta: number } | null;
  bloqueado: boolean;
}>();
const emit = defineEmits<{ elegir: [casilla: Casilla] }>();

const CASILLAS = Array.from({ length: 64 }, (_, i) => i);
const LETRAS = 'abcdefgh';

const destinoPorCasilla = computed(() => new Map(props.destinos.map((j) => [j.hasta, j])));
const ocupadas = computed(() => new Set(props.piezas.map((p) => p.casilla)));

function clases(casilla: Casilla) {
  const destino = destinoPorCasilla.value.get(casilla);
  return [
    estilos.casilla,
    (fila(casilla) + columna(casilla)) % 2 === 0 ? estilos.clara : estilos.oscura,
    props.ultima && (props.ultima.desde === casilla || props.ultima.hasta === casilla) ? estilos.ultima : '',
    props.seleccion === casilla ? estilos.seleccionada : '',
    props.jaque === casilla ? estilos.jaque : '',
    destino ? (destino.captura ? estilos.destinoCaptura : estilos.destino) : '',
  ];
}

function posicionDe(casilla: Casilla) {
  return { '--x': String(columna(casilla)), '--y': String(fila(casilla)) };
}
</script>

<template>
  <div :class="[estilos.tablero, bloqueado ? estilos.bloqueado : '']" role="grid" aria-label="Tablero de ajedrez">
    <button
      v-for="casilla in CASILLAS"
      :key="casilla"
      type="button"
      :class="clases(casilla)"
      :aria-label="nombreDe(casilla)"
      :data-casilla="nombreDe(casilla)"
      :data-ocupada="ocupadas.has(casilla) ? 'si' : undefined"
      :disabled="bloqueado"
      @click="emit('elegir', casilla)"
    >
      <span v-if="columna(casilla) === 0" :class="estilos.coordFila">{{ 8 - fila(casilla) }}</span>
      <span v-if="fila(casilla) === 7" :class="estilos.coordColumna">{{ LETRAS[columna(casilla)] }}</span>
    </button>

    <div :class="estilos.capaPiezas" aria-hidden="true">
      <div
        v-for="pieza in piezas"
        :key="pieza.id"
        :class="[estilos.pieza, seleccion === pieza.casilla ? estilos.piezaElegida : '']"
        :style="posicionDe(pieza.casilla)"
        :data-pieza="`${pieza.color}${pieza.tipo}@${nombreDe(pieza.casilla)}`"
      >
        <PiezaAjedrez :tipo="pieza.tipo" :color="pieza.color" />
      </div>
      <div
        v-for="pieza in caidas"
        :key="`caida-${pieza.id}`"
        :class="[estilos.pieza, estilos.piezaCae]"
        :style="posicionDe(pieza.casilla)"
      >
        <PiezaAjedrez :tipo="pieza.tipo" :color="pieza.color" />
      </div>
      <div
        v-if="destello"
        :key="`destello-${destello.vuelta}`"
        :class="[estilos.destello, destello.correcta ? estilos.destelloBien : estilos.destelloMal]"
        :style="posicionDe(destello.casilla)"
      />
    </div>
  </div>
</template>
