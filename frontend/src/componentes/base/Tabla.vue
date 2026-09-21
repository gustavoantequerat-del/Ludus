<script setup lang="ts">
import estilos from './Tabla.module.css';
import Icono from './Icono.vue';

const props = defineProps<{
  columnas: { etiqueta: string; flex?: number }[];
  items: unknown[];
  busqueda?: string;
  textoVacio?: string;
}>();
defineEmits<{ 'update:busqueda': [valor: string] }>();
defineSlots<{ fila(props: { item: any }): any; filtros?(): any }>();
void props;
</script>

<template>
  <div :class="estilos.contenedor">
    <div :class="estilos.herramientas">
      <div :class="estilos.busqueda">
        <Icono nombre="search" :tamano="15" />
        <input
          :class="estilos.busquedaEntrada"
          :value="busqueda"
          placeholder="Buscar..."
          @input="$emit('update:busqueda', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <slot name="filtros" />
      <span :class="estilos.conteo">{{ items.length }} registros</span>
    </div>
    <div :class="estilos.desplazable">
      <div :class="estilos.tabla">
        <div :class="estilos.filaCabecera">
          <span
            v-for="columna in columnas"
            :key="columna.etiqueta"
            :class="estilos.columnaCabecera"
            :style="{ flex: columna.flex ?? 1 }"
            >{{ columna.etiqueta }}</span
          >
        </div>
        <div v-for="(item, indice) in items" :key="indice" :class="estilos.fila">
          <slot name="fila" :item="item" />
        </div>
        <div v-if="items.length === 0" :class="estilos.vacio">
          <Icono nombre="search-x" :tamano="26" />
          <span>{{ textoVacio ?? 'Sin resultados' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
