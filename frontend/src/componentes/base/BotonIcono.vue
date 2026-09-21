<script setup lang="ts">
import estilos from './BotonIcono.module.css';
import Icono from './Icono.vue';

withDefaults(
  defineProps<{
    icono: string;
    titulo: string;
    texto?: string;
    peligro?: boolean;
    relleno?: boolean;
  }>(),
  { peligro: false, relleno: false },
);
</script>

<template>
  <button
    :class="[
      estilos.boton,
      texto ? estilos.conTexto : '',
      peligro ? estilos.peligro : '',
      relleno ? estilos.relleno : '',
    ]"
    :title="titulo"
    type="button"
  >
    <Icono :nombre="icono" :tamano="14" />
    <span v-if="texto">{{ texto }}</span>
  </button>
</template>
