<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import estilos from './BarraLateral.module.css';
import Icono from '@/componentes/base/Icono.vue';
import { usarNavegacion } from '@/composables/usarNavegacion';

const props = defineProps<{ colapsada: boolean }>();

const { items } = usarNavegacion();
const ruta = useRoute();
const enrutador = useRouter();

/**
 * El item queda activo tambien en las rutas hijas de su seccion, que se
 * nombran con el prefijo del item ('editor' -> 'editor-juego').
 */
function esActivo(nombreItem: string) {
  const actual = String(ruta.name ?? '');
  return actual === nombreItem || actual.startsWith(nombreItem + '-');
}
</script>

<template>
  <nav :class="estilos.nav" :style="{ width: props.colapsada ? '62px' : '228px' }">
    <button
      v-for="item in items"
      :key="item.ruta"
      :class="[estilos.item, esActivo(item.ruta) ? estilos.itemActivo : '']"
      :title="item.etiqueta"
      @click="enrutador.push({ name: item.ruta })"
    >
      <span :class="estilos.icono"><Icono :nombre="item.icono" :tamano="17" /></span>
      <span v-if="!props.colapsada" :class="estilos.etiqueta">{{ item.etiqueta }}</span>
    </button>
  </nav>
</template>
