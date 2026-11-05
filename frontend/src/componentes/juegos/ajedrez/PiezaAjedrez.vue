<script setup lang="ts">
/**
 * Pieza de ajedrez dibujada en SVG: seis figuras (las mismas para los dos
 * bandos) y el color lo pone el CSS. Pesan unos pocos KB en total y no hay
 * imagenes que descargar.
 */
import estilos from './PiezaAjedrez.module.css';
import type { Color, TipoPieza } from '@/utilidades/ajedrez/motor';

defineProps<{ tipo: TipoPieza; color: Color }>();

const BASE = 'M10 39 Q11 33 22.5 33 Q34 33 35 39 Z';
</script>

<template>
  <svg :class="[estilos.pieza, color === 'b' ? estilos.blanca : estilos.negra]" viewBox="0 0 45 45" aria-hidden="true">
    <!-- Peon -->
    <g v-if="tipo === 'p'">
      <circle cx="22.5" cy="13" r="5.5" />
      <path d="M17.5 21.5 Q22.5 17.5 27.5 21.5 L30 33 H15 Z" />
      <path :d="BASE" />
    </g>
    <!-- Torre -->
    <g v-else-if="tipo === 't'">
      <path d="M11 8 H15.5 V11.5 H20 V8 H25 V11.5 H29.5 V8 H34 V15.5 L31 18.5 V30 L34 33 V38.5 H11 V33 L14 30 V18.5 L11 15.5 Z" />
      <path :class="estilos.detalle" d="M14 18.5 H31 M14 30 H31" />
    </g>
    <!-- Alfil -->
    <g v-else-if="tipo === 'a'">
      <circle cx="22.5" cy="7.5" r="2.6" />
      <path d="M22.5 10.5 C15.5 15.5 13.5 22 17 27.5 H28 C31.5 22 29.5 15.5 22.5 10.5 Z" />
      <path d="M15.5 27.5 H29.5 V31.5 H15.5 Z" />
      <path :d="BASE" />
      <path :class="estilos.detalle" d="M19.5 17 L25.5 22.5" />
    </g>
    <!-- Caballo -->
    <g v-else-if="tipo === 'c'">
      <path d="M12.5 38.5 H33 V34 C33.5 25 31 18 26.5 13 L27 8 L23.5 10.5 L21 8.5 L19.5 13 C15 15.5 11 20.5 9.5 25.5 L12.5 28 L17 25 L19.5 25.5 C15.5 29.5 13.5 33.5 12.5 38.5 Z" />
      <circle :class="estilos.ojo" cx="19.5" cy="17.5" r="1.4" />
    </g>
    <!-- Dama -->
    <g v-else-if="tipo === 'd'">
      <path d="M11.5 31 L8 15.5 L14.5 24 L15.5 12.5 L19.5 23 L22.5 10.5 L25.5 23 L29.5 12.5 L30.5 24 L37 15.5 L33.5 31 Z" />
      <circle cx="8" cy="14" r="2.2" />
      <circle cx="15.5" cy="11" r="2.2" />
      <circle cx="22.5" cy="9" r="2.2" />
      <circle cx="29.5" cy="11" r="2.2" />
      <circle cx="37" cy="14" r="2.2" />
      <path :d="BASE" />
    </g>
    <!-- Rey -->
    <g v-else>
      <path d="M21 3.5 H24 V6.5 H27 V9.5 H24 V13.5 H21 V9.5 H18 V6.5 H21 Z" />
      <path d="M22.5 13.5 C30 13.5 36.5 17.5 34.5 24.5 L31 31 H14 L10.5 24.5 C8.5 17.5 15 13.5 22.5 13.5 Z" />
      <path :d="BASE" />
      <path :class="estilos.detalle" d="M14 31 H31" />
    </g>
  </svg>
</template>
