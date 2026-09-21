<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Tabla from '@/componentes/base/Tabla.vue';
import CeldaPersona from '@/componentes/base/CeldaPersona.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import { resultadosServicio } from '@/servicios/resultados.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { formatoFecha } from '@/utilidades/texto';
import type { Resultado } from '@/tipos';

const almacen = useAlmacenAutenticacion();
const esEstudiante = computed(() => almacen.usuario?.rol === 'estudiante');
const titulo = computed(() => (esEstudiante.value ? 'Calificaciones' : 'Resultados'));

const resultados = ref<Resultado[]>([]);
const busqueda = ref('');
const cargando = ref(true);

const columnas = computed(() => [
  ...(esEstudiante.value ? [] : [{ etiqueta: 'Estudiante', flex: 1.3 }]),
  { etiqueta: 'Curso / Modulo', flex: 1.5 },
  { etiqueta: 'Intento', flex: 0.6 },
  { etiqueta: 'Puntaje', flex: 0.8 },
  { etiqueta: 'Nota', flex: 0.7 },
  { etiqueta: 'Fecha', flex: 0.7 },
]);

const filtrados = computed(() =>
  resultados.value.filter(
    (r) =>
      r.estudiante.nombre.toLowerCase().includes(busqueda.value.toLowerCase()) ||
      r.modulo.curso.nombre.toLowerCase().includes(busqueda.value.toLowerCase()) ||
      r.modulo.titulo.toLowerCase().includes(busqueda.value.toLowerCase()),
  ),
);

onMounted(async () => {
  cargando.value = true;
  resultados.value = await resultadosServicio.listar();
  cargando.value = false;
});
</script>

<template>
  <Encabezado :titulo="titulo" subtitulo="Puntajes por estudiante, modulo e intento." />

  <Tabla v-if="!cargando" :columnas="columnas" :items="filtrados" v-model:busqueda="busqueda">
    <template #fila="{ item }">
      <div v-if="!esEstudiante" style="flex: 1.3; min-width: 0">
        <CeldaPersona :nombre="item.estudiante.nombre" />
      </div>
      <div style="flex: 1.5; min-width: 0">
        <div style="font: 600 12.5px var(--fuente-texto)">{{ item.modulo.curso.nombre }}</div>
        <div style="font: 400 10.5px var(--fuente-texto); color: var(--tenue)">{{ item.modulo.titulo }}</div>
      </div>
      <div style="flex: 0.6">{{ item.intento }}</div>
      <div style="flex: 0.8">{{ item.puntaje }} pts</div>
      <div style="flex: 0.7">
        <Insignia :tono="item.nota ? 'ok' : 'neutro'">{{ item.nota ?? '—' }}</Insignia>
      </div>
      <div style="flex: 0.7">{{ formatoFecha(item.creadoEn) }}</div>
    </template>
  </Tabla>
</template>
