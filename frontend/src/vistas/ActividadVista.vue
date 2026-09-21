<script setup lang="ts">
import { onMounted, ref } from 'vue';
import estilos from './ActividadVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Icono from '@/componentes/base/Icono.vue';
import { panelServicio } from '@/servicios/panel.servicio';
import { formatoFecha } from '@/utilidades/texto';
import type { EventoActividad } from '@/tipos';

const actividad = ref<EventoActividad[]>([]);

onMounted(async () => {
  actividad.value = await panelServicio.actividad();
});
</script>

<template>
  <Encabezado titulo="Actividad" subtitulo="Registro de acciones administrativas y de juego." />

  <div :class="estilos.panel">
    <div v-for="(a, indice) in actividad" :key="indice" :class="estilos.fila">
      <span :class="estilos.icono"><Icono nombre="activity" :tamano="16" /></span>
      <div :class="estilos.textos">
        <span :class="estilos.texto">{{ a.texto }}</span>
        <span :class="estilos.cuando">{{ formatoFecha(a.cuando) }} · {{ a.institucion }}</span>
      </div>
    </div>
  </div>
</template>
