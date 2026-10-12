<script setup lang="ts">
/** El Runner Narrativo solo necesita saber que historia corre el modulo. */
import { onMounted, ref } from 'vue';
import estilos from './Ajustes.module.css';
import Icono from '@/componentes/base/Icono.vue';
import { historiasServicio } from '@/servicios/historias.servicio';
import type { Historia } from '@/tipos';

const props = defineProps<{ ajustes: Record<string, unknown> }>();
const emit = defineEmits<{ 'update:ajustes': [valor: Record<string, unknown>] }>();

const historias = ref<Historia[]>([]);
const cargando = ref(true);

function elegir(historia: Historia) {
  emit('update:ajustes', { historiaId: historia.id });
}

function incompleta(historia: Historia) {
  return !historia.videoIntro || historia.preguntas.some((p) => !p.videoBueno || !p.videoMalo);
}

onMounted(async () => {
  historias.value = await historiasServicio.listar();
  cargando.value = false;
  if (!props.ajustes.historiaId && historias.value.length > 0) elegir(historias.value[0]);
});
</script>

<template>
  <div :class="estilos.campo">
    <span :class="estilos.etiqueta">Historia</span>
    <p v-if="!cargando && historias.length === 0" :class="estilos.vacio">
      Todavia no hay historias. Crea una en Editor &gt; Runner Narrativo y vuelve aqui.
    </p>
    <div v-else :class="estilos.opciones">
      <button
        v-for="historia in historias"
        :key="historia.id"
        type="button"
        :class="[estilos.opcion, ajustes.historiaId === historia.id ? estilos.opcionActiva : '']"
        @click="elegir(historia)"
      >
        <span :class="estilos.iconoOpcion"><Icono nombre="clapperboard" :tamano="16" /></span>
        <span :class="estilos.opcionTextos">
          <span :class="estilos.opcionNombre">{{ historia.nombre }}</span>
          <span :class="estilos.opcionDetalle">
            {{ historia.preguntas.length }} pregunta(s){{ incompleta(historia) ? ' · le faltan videos' : '' }}
          </span>
        </span>
      </button>
    </div>
  </div>
</template>
