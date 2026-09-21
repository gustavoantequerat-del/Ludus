<script setup lang="ts">
import estilos from './CampoRango.module.css';

const props = defineProps<{
  modelValue: number;
  etiqueta: string;
  min: number;
  max: number;
  unidad?: string;
}>();
defineEmits<{ 'update:modelValue': [valor: number] }>();
void props;
</script>

<template>
  <div :class="estilos.campo">
    <span :class="estilos.etiqueta">{{ etiqueta }}</span>
    <div :class="estilos.fila">
      <input
        :class="estilos.entrada"
        type="range"
        :min="min"
        :max="max"
        :value="modelValue"
        @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      />
      <span :class="estilos.valor">{{ modelValue }}{{ unidad ?? '' }}</span>
    </div>
  </div>
</template>
