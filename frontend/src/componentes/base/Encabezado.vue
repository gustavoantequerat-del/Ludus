<script setup lang="ts">
import estilos from './Encabezado.module.css';
import Icono from './Icono.vue';

withDefaults(
  defineProps<{
    titulo: string;
    subtitulo?: string;
    migaDeReturno?: string;
  }>(),
  {},
);
defineEmits<{ volver: [] }>();
</script>

<template>
  <div :class="estilos.fila">
    <div :class="estilos.textos">
      <button v-if="migaDeReturno" :class="estilos.volver" @click="$emit('volver')">
        <Icono nombre="arrow-left" :tamano="14" />{{ migaDeReturno }}
      </button>
      <h1 :class="estilos.titulo">{{ titulo }}</h1>
      <p v-if="subtitulo" :class="estilos.subtitulo">{{ subtitulo }}</p>
    </div>
    <div :class="estilos.acciones">
      <slot />
    </div>
  </div>
</template>
