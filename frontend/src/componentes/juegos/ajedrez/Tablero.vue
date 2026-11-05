<script setup lang="ts">
/** Tablero visto desde las blancas (el estudiante). Solo dibuja y avisa que casilla se toco. */
import { computed } from 'vue';
import estilos from './Tablero.module.css';
import PiezaAjedrez from './PiezaAjedrez.vue';
import { columna, fila, nombreDe, type Casilla, type Jugada, type Posicion } from '@/utilidades/ajedrez/motor';

const props = defineProps<{
  posicion: Posicion;
  seleccion: Casilla | null;
  destinos: Jugada[];
  ultima: { desde: Casilla; hasta: Casilla } | null;
  /** Casilla del rey en jaque, para marcarla. */
  jaque: Casilla | null;
  bloqueado: boolean;
}>();
const emit = defineEmits<{ elegir: [casilla: Casilla] }>();

const CASILLAS = Array.from({ length: 64 }, (_, i) => i);
const LETRAS = 'abcdefgh';

const destinoPorCasilla = computed(() => new Map(props.destinos.map((j) => [j.hasta, j])));

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
      :disabled="bloqueado"
      @click="emit('elegir', casilla)"
    >
      <PiezaAjedrez
        v-if="posicion.tablero[casilla]"
        :tipo="posicion.tablero[casilla]!.tipo"
        :color="posicion.tablero[casilla]!.color"
      />
      <span v-if="columna(casilla) === 0" :class="estilos.coordFila">{{ 8 - fila(casilla) }}</span>
      <span v-if="fila(casilla) === 7" :class="estilos.coordColumna">{{ LETRAS[columna(casilla)] }}</span>
    </button>
  </div>
</template>
