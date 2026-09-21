<script setup lang="ts">
import estilos from './ContenedorNotificaciones.module.css';
import Icono from '@/componentes/base/Icono.vue';
import { usarNotificaciones } from '@/composables/usarNotificaciones';

const { mensaje } = usarNotificaciones();
</script>

<template>
  <div v-if="mensaje" :class="estilos.toast">
    <Icono nombre="check-circle-2" :tamano="17" />
    <span :class="estilos.texto">{{ mensaje }}</span>
  </div>
</template>
