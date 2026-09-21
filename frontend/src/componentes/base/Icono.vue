<script setup lang="ts">
import { computed } from 'vue';
import * as iconosLucide from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    nombre: string;
    tamano?: number;
  }>(),
  { tamano: 16 },
);

function aPascalCase(nombreKebab: string): string {
  return nombreKebab
    .split('-')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join('');
}

const componenteIcono = computed(() => {
  const clave = aPascalCase(props.nombre) as keyof typeof iconosLucide;
  return (iconosLucide[clave] as any) ?? iconosLucide.HelpCircle;
});
</script>

<template>
  <component :is="componenteIcono" :size="tamano" :stroke-width="2" />
</template>
