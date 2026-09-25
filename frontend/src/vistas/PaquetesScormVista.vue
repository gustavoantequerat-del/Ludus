<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Tabla from '@/componentes/base/Tabla.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import BotonIcono from '@/componentes/base/BotonIcono.vue';
import Icono from '@/componentes/base/Icono.vue';
import Modal from '@/componentes/base/Modal.vue';
import { scormServicio } from '@/servicios/scorm.servicio';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { formatoFecha } from '@/utilidades/texto';
import type { PaqueteScorm } from '@/tipos';

const { notificar } = usarNotificaciones();

const paquetes = ref<PaqueteScorm[]>([]);
const busqueda = ref('');
const cargando = ref(true);
const paqueteAEliminar = ref<PaqueteScorm | null>(null);

const columnas = [
  { etiqueta: 'Modulo', flex: 1.8 },
  { etiqueta: 'Curso', flex: 1.2 },
  { etiqueta: 'Estado', flex: 0.8 },
  { etiqueta: 'Creado', flex: 0.8 },
];

const filtrados = computed(() =>
  paquetes.value.filter((p) =>
    (p.modulo?.titulo ?? '').toLowerCase().includes(busqueda.value.toLowerCase()),
  ),
);

async function cargar() {
  cargando.value = true;
  paquetes.value = await scormServicio.listar();
  cargando.value = false;
}

async function descargar(paquete: PaqueteScorm) {
  await scormServicio.descargar(paquete.id, `ludus-${paquete.modulo?.titulo ?? 'modulo'}.zip`);
  notificar('Descarga iniciada');
}

async function alternarEstado(paquete: PaqueteScorm) {
  await scormServicio.cambiarEstado(paquete.id, !paquete.activo);
  notificar(paquete.activo ? 'Paquete desactivado' : 'Paquete reactivado');
  await cargar();
}

async function confirmarEliminar() {
  if (!paqueteAEliminar.value) return;
  await scormServicio.eliminar(paqueteAEliminar.value.id);
  paqueteAEliminar.value = null;
  notificar('Paquete eliminado');
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <Encabezado
    titulo="Paquetes SCORM"
    subtitulo="Modulos exportados para usarse dentro de un LMS externo. Desactivar un paquete corta el acceso sin borrar los resultados."
  />

  <Tabla
    v-if="!cargando"
    :columnas="columnas"
    :items="filtrados"
    v-model:busqueda="busqueda"
    texto-vacio="Aun no exportas ningun modulo. Hazlo desde el detalle de un curso."
  >
    <template #fila="{ item }">
      <div style="flex: 1.8; min-width: 0; display: flex; align-items: center; gap: 9px">
        <Icono nombre="package" :tamano="16" />
        <div style="min-width: 0">
          <div style="font: 600 12.5px var(--fuente-texto)">{{ item.modulo?.titulo }}</div>
          <div style="font: 400 10.5px var(--fuente-texto); color: var(--tenue)">
            {{ item.modulo?.configuracionJuego?.juego?.nombre ?? 'SCORM 1.2' }}
          </div>
        </div>
      </div>
      <div style="flex: 1.2">{{ item.modulo?.curso?.nombre }}</div>
      <div style="flex: 0.8">
        <Insignia :tono="item.activo ? 'ok' : 'neutro'">
          {{ item.activo ? 'Activo' : 'Desactivado' }}
        </Insignia>
      </div>
      <div style="flex: 0.8">{{ formatoFecha(item.creadoEn) }}</div>
      <div style="flex: none; display: flex; gap: 6px; margin-left: auto">
        <BotonIcono icono="download" titulo="Descargar ZIP" @click="descargar(item)" />
        <BotonIcono
          :icono="item.activo ? 'ban' : 'check'"
          :titulo="item.activo ? 'Desactivar' : 'Reactivar'"
          @click="alternarEstado(item)"
        />
        <BotonIcono
          icono="trash-2"
          titulo="Eliminar"
          peligro
          @click="paqueteAEliminar = item"
        />
      </div>
    </template>
  </Tabla>

  <Modal
    v-if="paqueteAEliminar"
    titulo="Eliminar paquete SCORM?"
    :descripcion="`El paquete de «${paqueteAEliminar.modulo?.titulo}» dejara de funcionar en el LMS donde este subido. Los resultados ya registrados se conservan.`"
    icono="trash-2"
    peligro
    etiqueta-confirmar="Eliminar"
    @cerrar="paqueteAEliminar = null"
    @confirmar="confirmarEliminar"
  />
</template>
