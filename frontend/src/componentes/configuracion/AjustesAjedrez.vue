<script setup lang="ts">
/**
 * El Ajedrez de Preguntas solo necesita saber que banco usa el modulo. El
 * tiempo y el minimo X viven en el banco (se editan en Editor > Ajedrez).
 */
import { onMounted, ref } from 'vue';
import estilos from './Ajustes.module.css';
import Icono from '@/componentes/base/Icono.vue';
import { ajedrezServicio } from '@/servicios/ajedrez.servicio';
import type { BancoAjedrez } from '@/tipos';

const MINIMO_PREGUNTAS = 10;

const props = defineProps<{ ajustes: Record<string, unknown> }>();
const emit = defineEmits<{ 'update:ajustes': [valor: Record<string, unknown>] }>();

const bancos = ref<BancoAjedrez[]>([]);
const cargando = ref(true);

function elegir(banco: BancoAjedrez) {
  emit('update:ajustes', { bancoId: banco.id });
}

function detalle(banco: BancoAjedrez) {
  const partes = [`${banco.preguntas.length} pregunta(s)`];
  partes.push(banco.minutos ? `${banco.minutos} min` : 'sin limite de tiempo');
  partes.push(`minimo ${banco.minimoPreguntas}`);
  const faltan = Math.max(MINIMO_PREGUNTAS, banco.minimoPreguntas) - banco.preguntas.length;
  if (faltan > 0) partes.push(`faltan ${faltan} para jugarse`);
  return partes.join(' · ');
}

onMounted(async () => {
  bancos.value = await ajedrezServicio.listarBancos();
  cargando.value = false;
  const listo = bancos.value.find((b) => b.preguntas.length >= Math.max(MINIMO_PREGUNTAS, b.minimoPreguntas));
  if (!props.ajustes.bancoId && listo) elegir(listo);
});
</script>

<template>
  <div :class="estilos.campo">
    <span :class="estilos.etiqueta">Banco de preguntas</span>
    <p v-if="!cargando && bancos.length === 0" :class="estilos.vacio">
      Todavia no hay bancos de preguntas. Crea uno en Editor &gt; Ajedrez de Preguntas y vuelve aqui.
    </p>
    <div v-else :class="estilos.opciones">
      <button
        v-for="banco in bancos"
        :key="banco.id"
        type="button"
        :class="[estilos.opcion, ajustes.bancoId === banco.id ? estilos.opcionActiva : '']"
        @click="elegir(banco)"
      >
        <span :class="estilos.iconoOpcion"><Icono nombre="crown" :tamano="16" /></span>
        <span :class="estilos.opcionTextos">
          <span :class="estilos.opcionNombre">{{ banco.nombre }}</span>
          <span :class="estilos.opcionDetalle">{{ detalle(banco) }}</span>
        </span>
      </button>
    </div>
  </div>
</template>
