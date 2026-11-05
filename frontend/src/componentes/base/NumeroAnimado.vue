<script setup lang="ts">
/** Un numero que cuenta desde el valor anterior (o desde 0) hasta el nuevo. */
import { onBeforeUnmount, ref, watch } from 'vue';

const props = withDefaults(defineProps<{ valor: number; duracionMs?: number }>(), { duracionMs: 700 });

const mostrado = ref(0);
let cuadro = 0;

function animar(desde: number, hasta: number) {
  cancelAnimationFrame(cuadro);
  const sinMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (sinMovimiento || desde === hasta) {
    mostrado.value = hasta;
    return;
  }
  const inicio = performance.now();
  const paso = (ahora: number) => {
    const t = Math.min(1, (ahora - inicio) / props.duracionMs);
    const suave = 1 - (1 - t) ** 3;
    mostrado.value = Math.round(desde + (hasta - desde) * suave);
    if (t < 1) cuadro = requestAnimationFrame(paso);
  };
  cuadro = requestAnimationFrame(paso);
}

watch(() => props.valor, (nuevo, viejo) => animar(viejo ?? 0, nuevo), { immediate: true });
onBeforeUnmount(() => cancelAnimationFrame(cuadro));
</script>

<template>
  <span>{{ mostrado }}</span>
</template>
