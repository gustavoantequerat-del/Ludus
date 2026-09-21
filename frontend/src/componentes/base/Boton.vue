<script setup lang="ts">
import estilos from './Boton.module.css';
import Icono from './Icono.vue';

withDefaults(
  defineProps<{
    variante?: 'primario' | 'secundario' | 'peligro' | 'fantasma';
    icono?: string;
    tipo?: 'button' | 'submit';
    deshabilitado?: boolean;
  }>(),
  { variante: 'secundario', tipo: 'button', deshabilitado: false },
);
</script>

<template>
  <button
    :type="tipo"
    :class="[estilos.base, estilos[variante ?? 'secundario']]"
    :disabled="deshabilitado"
  >
    <Icono v-if="icono" :nombre="icono" :tamano="15" />
    <slot />
  </button>
</template>
