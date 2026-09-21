<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import estilos from './BarraLateral.module.css';
import Icono from '@/componentes/base/Icono.vue';
import { usarNavegacion } from '@/composables/usarNavegacion';

const props = defineProps<{ colapsada: boolean }>();

const { items } = usarNavegacion();
const ruta = useRoute();
const enrutador = useRouter();
</script>

<template>
  <nav :class="estilos.nav" :style="{ width: props.colapsada ? '62px' : '228px' }">
    <button
      v-for="item in items"
      :key="item.ruta"
      :class="[estilos.item, ruta.name === item.ruta ? estilos.itemActivo : '']"
      :title="item.etiqueta"
      @click="enrutador.push({ name: item.ruta })"
    >
      <span :class="estilos.icono"><Icono :nombre="item.icono" :tamano="17" /></span>
      <span v-if="!props.colapsada" :class="estilos.etiqueta">{{ item.etiqueta }}</span>
    </button>
  </nav>
</template>
