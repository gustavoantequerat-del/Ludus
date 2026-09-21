<script setup lang="ts">
import estilos from './CampoTexto.module.css';

withDefaults(
  defineProps<{
    modelValue: string;
    etiqueta: string;
    tipo?: 'texto' | 'area' | 'clave';
    marcador?: string;
  }>(),
  { tipo: 'texto' },
);
defineEmits<{ 'update:modelValue': [valor: string] }>();
</script>

<template>
  <label :class="estilos.campo">
    <span :class="estilos.etiqueta">{{ etiqueta }}</span>
    <textarea
      v-if="tipo === 'area'"
      :class="estilos.entrada"
      :value="modelValue"
      :placeholder="marcador"
      rows="3"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <input
      v-else
      :type="tipo === 'clave' ? 'password' : 'text'"
      :class="estilos.entrada"
      :value="modelValue"
      :placeholder="marcador"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>
