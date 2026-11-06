<script setup lang="ts">
/**
 * Pieza de ajedrez dibujada en SVG (figuras de utilidades/ajedrez/figuras.ts):
 * las mismas para los dos bandos y el color lo pone el CSS. Pesan unos pocos
 * KB en total y no hay imagenes que descargar.
 */
import { computed } from 'vue';
import estilos from './PiezaAjedrez.module.css';
import type { Color, TipoPieza } from '@/utilidades/ajedrez/motor';
import { figura } from '@/utilidades/ajedrez/figuras';

const props = defineProps<{ tipo: TipoPieza; color: Color }>();

// Markup generado aqui mismo (sin datos del usuario): seguro para v-html.
const contenido = computed(() => figura(props.tipo, { detalle: estilos.detalle, ojo: estilos.ojo }));
</script>

<template>
  <svg
    :class="[estilos.pieza, color === 'b' ? estilos.blanca : estilos.negra]"
    viewBox="0 0 45 45"
    aria-hidden="true"
    v-html="contenido"
  />
</template>
