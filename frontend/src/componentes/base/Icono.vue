<script setup lang="ts">
import { computed } from 'vue';
import { ICONOS, ICONO_DESCONOCIDO } from './iconos';

const props = withDefaults(
  defineProps<{
    /** Nombre del icono de lucide en kebab-case (ver iconos.ts). */
    nombre: string;
    tamano?: number;
  }>(),
  { tamano: 16 },
);

const componenteIcono = computed(() => {
  const icono = ICONOS[props.nombre];
  if (!icono && import.meta.env.DEV) console.warn(`[Ludus] Icono "${props.nombre}" sin registrar en iconos.ts`);
  return icono ?? ICONO_DESCONOCIDO;
});
</script>

<template>
  <component :is="componenteIcono" :size="tamano" :stroke-width="2" />
</template>
