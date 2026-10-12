<script setup lang="ts">
import estilos from './CabeceraSector.module.css';
import Icono from './Icono.vue';

defineProps<{ titulo: string; descripcion?: string; icono: string; ludico?: boolean }>();
</script>

<template>
  <div :class="estilos.cabecera">
    <span :class="[estilos.icono, ludico ? estilos.iconoLudico : '']">
      <Icono :nombre="icono" :tamano="16" />
    </span>
    <div :class="estilos.textos">
      <h2 :class="estilos.titulo">{{ titulo }}</h2>
      <p v-if="descripcion" :class="estilos.descripcion">{{ descripcion }}</p>
    </div>
  </div>
</template>
