<script setup lang="ts">
import estilos from './CampoInterruptor.module.css';

defineProps<{ modelValue: boolean; texto: string }>();
defineEmits<{ 'update:modelValue': [valor: boolean] }>();
</script>

<template>
  <button
    type="button"
    :class="[estilos.boton, modelValue ? estilos.botonActivo : '']"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span :class="estilos.texto">{{ texto }}</span>
    <span :class="[estilos.pista, modelValue ? estilos.pistaActiva : '']">
      <span :class="estilos.perilla" />
    </span>
  </button>
</template>
