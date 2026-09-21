<script setup lang="ts">
import { ref } from 'vue';
import estilos from './EsqueletoApp.module.css';
import BarraSuperior from './BarraSuperior.vue';
import BarraLateral from './BarraLateral.vue';
import ContenedorNotificaciones from './ContenedorNotificaciones.vue';

const colapsada = ref(window.innerWidth < 980);
</script>

<template>
  <div :class="estilos.pagina">
    <BarraSuperior @alternar-panel="colapsada = !colapsada" />
    <div :class="estilos.cuerpo">
      <BarraLateral :colapsada="colapsada" />
      <main :class="estilos.contenido">
        <slot />
      </main>
    </div>
    <ContenedorNotificaciones />
  </div>
</template>
