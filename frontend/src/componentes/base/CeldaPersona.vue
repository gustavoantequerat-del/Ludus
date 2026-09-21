<script setup lang="ts">
import estilos from './CeldaPersona.module.css';
import { iniciales } from '@/utilidades/texto';

defineProps<{ nombre: string; detalle?: string }>();
</script>

<template>
  <div :class="estilos.celda">
    <span :class="estilos.avatar">{{ iniciales(nombre) }}</span>
    <div :class="estilos.textos">
      <span :class="estilos.nombre">{{ nombre }}</span>
      <span v-if="detalle" :class="estilos.detalle">{{ detalle }}</span>
    </div>
  </div>
</template>
