<script setup lang="ts">
/**
 * Podio de los tres primeros, en SVG: el primero al centro y mas alto, el
 * segundo a la izquierda y el tercero a la derecha. Si terminaron menos de
 * tres, solo se dibujan los escalones que tienen a alguien.
 */
import { computed } from 'vue';
import estilos from './Podio.module.css';
import { iniciales } from '@/utilidades/texto';
import type { FilaRanking } from '@/tipos';

const props = defineProps<{ filas: FilaRanking[] }>();

interface Escalon {
  fila: FilaRanking;
  x: number;
  alto: number;
  clase: string;
  retraso: number;
}

const ANCHO = 120;
const BASE_Y = 250;
/** Posicion en pantalla de cada puesto: 2 - 1 - 3. */
const LUGARES: Record<number, { x: number; alto: number; clase: string; retraso: number }> = {
  1: { x: 140, alto: 130, clase: estilos.oro, retraso: 0.45 },
  2: { x: 10, alto: 100, clase: estilos.plata, retraso: 0.2 },
  3: { x: 270, alto: 78, clase: estilos.bronce, retraso: 0 },
};

const escalones = computed<Escalon[]>(() =>
  props.filas
    .filter((f) => f.posicion <= 3)
    .map((fila) => ({ fila, ...LUGARES[fila.posicion] })),
);

function recortar(nombre: string) {
  return nombre.length > 16 ? `${nombre.slice(0, 15)}…` : nombre;
}
</script>

<template>
  <svg :class="estilos.podio" viewBox="0 0 400 270" role="img" :aria-label="`Podio: ${escalones.map((e) => `${e.fila.posicion}. ${e.fila.nombre}`).join(', ')}`">
    <defs>
      <linearGradient id="podio-brillo" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity="0.35" />
        <stop offset="1" stop-color="#fff" stop-opacity="0" />
      </linearGradient>
    </defs>
    <g
      v-for="e in escalones"
      :key="e.fila.posicion"
      :class="[estilos.escalon, e.clase, e.fila.esYo ? estilos.yo : '']"
      :style="{ '--retraso': `${e.retraso}s` }"
    >
      <!-- Bloque del escalon -->
      <g :class="estilos.bloque">
        <rect :x="e.x" :y="BASE_Y - e.alto" :width="ANCHO" :height="e.alto" rx="10" :class="estilos.cuerpo" />
        <rect :x="e.x" :y="BASE_Y - e.alto" :width="ANCHO" :height="e.alto" rx="10" fill="url(#podio-brillo)" />
        <text :x="e.x + ANCHO / 2" :y="BASE_Y - e.alto + 40" text-anchor="middle" :class="estilos.numero">{{ e.fila.posicion }}</text>
        <text :x="e.x + ANCHO / 2" :y="BASE_Y - e.alto + 62" text-anchor="middle" :class="estilos.nota">{{ e.fila.nota.toFixed(1) }}</text>
      </g>
      <!-- Persona sobre el escalon -->
      <g :class="estilos.persona">
        <path
          v-if="e.fila.posicion === 1"
          :class="estilos.corona"
          :d="`M${e.x + 44} ${BASE_Y - e.alto - 70} l6 12 l10 -14 l10 14 l6 -12 l-3 20 h-26 z`"
        />
        <circle :cx="e.x + ANCHO / 2" :cy="BASE_Y - e.alto - 30" r="24" :class="estilos.avatar" />
        <text :x="e.x + ANCHO / 2" :y="BASE_Y - e.alto - 24" text-anchor="middle" :class="estilos.iniciales">
          {{ iniciales(e.fila.nombre) }}
        </text>
        <text :x="e.x + ANCHO / 2" :y="BASE_Y + 16" text-anchor="middle" :class="estilos.nombre">
          {{ e.fila.esYo ? 'Tu' : recortar(e.fila.nombre) }}
        </text>
      </g>
    </g>
    <line x1="0" :y1="BASE_Y" x2="400" :y2="BASE_Y" :class="estilos.suelo" />
  </svg>
</template>
