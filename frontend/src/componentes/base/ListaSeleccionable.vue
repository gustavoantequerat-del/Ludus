<script setup lang="ts">
import estilos from './ListaSeleccionable.module.css';
import Icono from './Icono.vue';

const props = defineProps<{
  modelValue: string[];
  opciones: { id: string; texto: string; sub?: string }[];
}>();
const emit = defineEmits<{ 'update:modelValue': [valor: string[]] }>();

function alternar(id: string) {
  const seleccionados = props.modelValue.includes(id)
    ? props.modelValue.filter((x) => x !== id)
    : [...props.modelValue, id];
  emit('update:modelValue', seleccionados);
}
</script>

<template>
  <div :class="estilos.lista">
    <button
      v-for="opcion in opciones"
      :key="opcion.id"
      type="button"
      :class="[estilos.opcion, modelValue.includes(opcion.id) ? estilos.opcionActiva : '']"
      @click="alternar(opcion.id)"
    >
      <span :class="[estilos.marca, modelValue.includes(opcion.id) ? estilos.marcaActiva : '']">
        <Icono :nombre="modelValue.includes(opcion.id) ? 'check-square' : 'square'" :tamano="16" />
      </span>
      <span :class="estilos.texto">{{ opcion.texto }}</span>
      <span v-if="opcion.sub" :class="estilos.sub">{{ opcion.sub }}</span>
    </button>
  </div>
</template>
