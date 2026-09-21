<script setup lang="ts">
import estilos from './CampoSelector.module.css';

defineProps<{
  modelValue: string;
  etiqueta: string;
  opciones: { valor: string; texto: string }[];
}>();
defineEmits<{ 'update:modelValue': [valor: string] }>();
</script>

<template>
  <div :class="estilos.campo">
    <span :class="estilos.etiqueta">{{ etiqueta }}</span>
    <div :class="estilos.opciones">
      <button
        v-for="opcion in opciones"
        :key="opcion.valor"
        type="button"
        :class="[estilos.opcion, modelValue === opcion.valor ? estilos.opcionActiva : '']"
        @click="$emit('update:modelValue', opcion.valor)"
      >
        {{ opcion.texto }}
      </button>
    </div>
  </div>
</template>
