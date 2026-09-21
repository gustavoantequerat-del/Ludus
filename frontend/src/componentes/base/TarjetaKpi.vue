<script setup lang="ts">
import estilos from './TarjetaKpi.module.css';
import Icono from './Icono.vue';

export interface Kpi {
  etiqueta: string;
  valor: string | number;
  icono: string;
}

defineProps<{ items: Kpi[] }>();
</script>

<template>
  <div :class="estilos.cuadricula">
    <div v-for="kpi in items" :key="kpi.etiqueta" :class="estilos.tarjeta">
      <div :class="estilos.fila">
        <span :class="estilos.icono"><Icono :nombre="kpi.icono" :tamano="16" /></span>
        <span :class="estilos.etiqueta">{{ kpi.etiqueta }}</span>
      </div>
      <span :class="estilos.valor">{{ kpi.valor }}</span>
    </div>
  </div>
</template>
