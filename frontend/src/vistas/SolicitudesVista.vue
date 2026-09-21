<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Tabla from '@/componentes/base/Tabla.vue';
import CeldaPersona from '@/componentes/base/CeldaPersona.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import Boton from '@/componentes/base/Boton.vue';
import CampoSelector from '@/componentes/base/CampoSelector.vue';
import { solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { formatoFecha } from '@/utilidades/texto';
import type { EstadoSolicitud, Solicitud } from '@/tipos';

const almacen = useAlmacenAutenticacion();
const { notificar } = usarNotificaciones();

const puedeResolver = computed(
  () => almacen.usuario?.rol === 'superadmin' || almacen.usuario?.rol === 'admin_institucion',
);

const solicitudes = ref<Solicitud[]>([]);
const busqueda = ref('');
const filtro = ref<EstadoSolicitud | 'todos'>('todos');
const cargando = ref(true);

const columnas = [
  { etiqueta: 'Estudiante', flex: 1.4 },
  { etiqueta: 'Tipo', flex: 0.8 },
  { etiqueta: 'Curso / Ruta', flex: 1.5 },
  { etiqueta: 'Estado', flex: 0.9 },
];

const filtradas = computed(() =>
  solicitudes.value
    .filter((s) => filtro.value === 'todos' || s.estado === filtro.value)
    .filter((s) => s.estudiante.nombre.toLowerCase().includes(busqueda.value.toLowerCase())),
);

async function cargar() {
  cargando.value = true;
  solicitudes.value = await solicitudesServicio.listar();
  cargando.value = false;
}

async function resolver(solicitud: Solicitud, estado: 'aprobada' | 'rechazada') {
  await solicitudesServicio.resolver(solicitud.id, estado);
  notificar(estado === 'aprobada' ? 'Solicitud aprobada' : 'Solicitud rechazada');
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <Encabezado
    titulo="Solicitudes"
    :subtitulo="almacen.usuario?.rol === 'estudiante' ? 'Estado de tus solicitudes de inscripcion y salida.' : 'Inscripciones y salidas por resolver.'"
  />

  <Tabla v-if="!cargando" :columnas="columnas" :items="filtradas" v-model:busqueda="busqueda" texto-vacio="Sin solicitudes">
    <template #filtros>
      <CampoSelector
        :model-value="filtro"
        etiqueta=""
        :opciones="[
          { valor: 'todos', texto: 'Todos' },
          { valor: 'pendiente', texto: 'Pendiente' },
          { valor: 'aprobada', texto: 'Aprobada' },
          { valor: 'rechazada', texto: 'Rechazada' },
        ]"
        @update:model-value="(v) => (filtro = v as EstadoSolicitud | 'todos')"
      />
    </template>
    <template #fila="{ item }">
      <div style="flex: 1.4; min-width: 0">
        <CeldaPersona :nombre="item.estudiante.nombre" :detalle="formatoFecha(item.creadoEn)" />
      </div>
      <div style="flex: 0.8">
        <Insignia :tono="item.tipo === 'ingreso' ? 'info' : 'alerta'">{{ item.tipo === 'ingreso' ? 'Ingreso' : 'Salida' }}</Insignia>
      </div>
      <div style="flex: 1.5">{{ item.curso?.nombre ?? item.ruta?.nombre }}</div>
      <div style="flex: 0.9">
        <Insignia :tono="item.estado === 'aprobada' ? 'ok' : item.estado === 'rechazada' ? 'error' : 'alerta'">
          {{ item.estado === 'aprobada' ? 'Aprobada' : item.estado === 'rechazada' ? 'Rechazada' : 'Pendiente' }}
        </Insignia>
      </div>
      <div v-if="puedeResolver && item.estado === 'pendiente'" style="flex: none; display: flex; gap: 6px; margin-left: auto">
        <Boton variante="primario" @click="resolver(item, 'aprobada')">Aceptar</Boton>
        <Boton variante="secundario" @click="resolver(item, 'rechazada')">Rechazar</Boton>
      </div>
    </template>
  </Tabla>
</template>
