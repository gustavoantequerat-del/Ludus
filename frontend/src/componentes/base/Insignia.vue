<script setup lang="ts">
import estilos from './Insignia.module.css';

withDefaults(
  defineProps<{ tono?: 'ok' | 'info' | 'alerta' | 'error' | 'neutro' | 'primario' }>(),
  { tono: 'neutro' },
);
</script>

<template>
  <span :class="[estilos.insignia, estilos[tono ?? 'neutro']]"><slot /></span>
</template>
