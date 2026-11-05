<script setup lang="ts">
import estilos from './TarjetaKpi.module.css';
import Icono from './Icono.vue';
import NumeroAnimado from './NumeroAnimado.vue';

export interface Kpi {
  etiqueta: string;
  valor: string | number;
  icono: string;
}

defineProps<{ items: Kpi[] }>();
</script>

<template>
  <div :class="estilos.cuadricula">
    <div v-for="(kpi, i) in items" :key="kpi.etiqueta" :class="estilos.tarjeta" :style="{ '--orden': i }">
      <div :class="estilos.fila">
        <span :class="estilos.icono"><Icono :nombre="kpi.icono" :tamano="16" /></span>
        <span :class="estilos.etiqueta">{{ kpi.etiqueta }}</span>
      </div>
      <span :class="estilos.valor">
        <NumeroAnimado v-if="typeof kpi.valor === 'number'" :valor="kpi.valor" />
        <template v-else>{{ kpi.valor }}</template>
      </span>
    </div>
  </div>
</template>
