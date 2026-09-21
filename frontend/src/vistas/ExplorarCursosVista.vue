<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Encabezado from '@/componentes/base/Encabezado.vue';
import TarjetaEntidad from '@/componentes/base/TarjetaEntidad.vue';
import Modal from '@/componentes/base/Modal.vue';
import { cursosServicio } from '@/servicios/cursos.servicio';
import { solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import type { Curso, Solicitud } from '@/tipos';

const { notificar } = usarNotificaciones();

const PALETA = [
  ['var(--secundario)', 'var(--exito)'],
  ['var(--primario)', 'var(--rosa)'],
  ['var(--terciario)', 'var(--secundario)'],
];

const cursos = ref<Curso[]>([]);
const misSolicitudes = ref<Solicitud[]>([]);
const cargando = ref(true);
const cursoConfirmar = ref<Curso | null>(null);

function yaSolicitado(cursoId: string) {
  return misSolicitudes.value.some(
    (s) => s.cursoId === cursoId && s.tipo === 'ingreso' && s.estado === 'pendiente',
  );
}

async function cargar() {
  cargando.value = true;
  const [explorables, solicitudes] = await Promise.all([
    cursosServicio.explorar(),
    solicitudesServicio.listar(),
  ]);
  cursos.value = explorables;
  misSolicitudes.value = solicitudes;
  cargando.value = false;
}

function abrirSolicitud(curso: Curso) {
  if (yaSolicitado(curso.id)) return;
  cursoConfirmar.value = curso;
}
async function confirmarSolicitud() {
  if (!cursoConfirmar.value) return;
  await solicitudesServicio.crear('ingreso', { cursoId: cursoConfirmar.value.id });
  notificar('Solicitud enviada');
  cursoConfirmar.value = null;
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <Encabezado
    titulo="Explorar cursos"
    subtitulo="Cursos abiertos de tu institucion. Puedes solicitar inscripcion y el administrador decide."
  />

  <div v-if="!cargando" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(268px, 1fr)); gap: 14px">
    <TarjetaEntidad
      v-for="(curso, indice) in cursos"
      :key="curso.id"
      icono="compass"
      :color-inicio="PALETA[indice % PALETA.length][0]"
      :color-fin="PALETA[indice % PALETA.length][1]"
      :titulo="curso.nombre"
      :descripcion="curso.descripcion"
      :etiqueta="yaSolicitado(curso.id) ? 'Solicitado' : null"
      :metas="[
        { icono: 'layers', texto: curso.totalModulos + ' modulos' },
        { icono: 'user-round', texto: curso.docente?.nombre ?? 'Sin docente' },
      ]"
      :progreso="null"
      :boton-texto="yaSolicitado(curso.id) ? 'Solicitud enviada' : 'Solicitar inscripcion'"
      :boton-icono="yaSolicitado(curso.id) ? 'clock' : 'inbox'"
      :boton-tono="yaSolicitado(curso.id) ? 'apagado' : 'primario'"
      @abrir="abrirSolicitud(curso)"
    />
  </div>

  <Modal
    v-if="cursoConfirmar"
    titulo="Solicitar inscripcion?"
    :descripcion="`Se enviara una solicitud al administrador para inscribirte en «${cursoConfirmar.nombre}».`"
    icono="inbox"
    etiqueta-confirmar="Enviar solicitud"
    @cerrar="cursoConfirmar = null"
    @confirmar="confirmarSolicitud"
  />
</template>
