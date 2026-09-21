<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import TarjetaEntidad from '@/componentes/base/TarjetaEntidad.vue';
import Modal from '@/componentes/base/Modal.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import { cursosServicio, type DatosCurso } from '@/servicios/cursos.servicio';
import { solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import type { Curso } from '@/tipos';

const enrutador = useRouter();
const almacen = useAlmacenAutenticacion();
const { notificar } = usarNotificaciones();

const esEstudiante = computed(() => almacen.usuario?.rol === 'estudiante');
const titulo = computed(() => (esEstudiante.value || almacen.usuario?.rol === 'docente' ? 'Mis cursos' : 'Cursos'));

const PALETA = [
  ['var(--primario)', 'var(--secundario)'],
  ['var(--terciario)', 'var(--primario)'],
  ['var(--secundario)', 'var(--terciario)'],
  ['var(--primario)', 'var(--rosa)'],
  ['var(--secundario)', 'var(--exito)'],
];

const cursos = ref<Curso[]>([]);
const cargando = ref(true);

const modalAbierto = ref<'formulario' | 'eliminar' | 'solicitarSalida' | null>(null);
const edicion = ref<Curso | null>(null);
const form = ref<DatosCurso>({ nombre: '', descripcion: '' });
const cursoSalida = ref<Curso | null>(null);

async function cargar() {
  cargando.value = true;
  cursos.value = await cursosServicio.listar();
  cargando.value = false;
}

function abrirCurso(curso: Curso) {
  enrutador.push({ name: 'curso-detalle', params: { id: curso.id } });
}
function abrirCrear() {
  edicion.value = null;
  form.value = { nombre: '', descripcion: '' };
  modalAbierto.value = 'formulario';
}
function abrirEditar(curso: Curso) {
  edicion.value = curso;
  form.value = { nombre: curso.nombre, descripcion: curso.descripcion };
  modalAbierto.value = 'formulario';
}
function abrirEliminar(curso: Curso) {
  edicion.value = curso;
  modalAbierto.value = 'eliminar';
}
function abrirSolicitarSalida(curso: Curso) {
  cursoSalida.value = curso;
  modalAbierto.value = 'solicitarSalida';
}
function cerrarModal() {
  modalAbierto.value = null;
  edicion.value = null;
  cursoSalida.value = null;
}
async function confirmar() {
  if (modalAbierto.value === 'formulario') {
    if (edicion.value) {
      await cursosServicio.actualizar(edicion.value.id, form.value);
      notificar('Cambios guardados');
    } else {
      await cursosServicio.crear(form.value);
      notificar('Registro creado');
    }
  } else if (modalAbierto.value === 'eliminar' && edicion.value) {
    await cursosServicio.eliminar(edicion.value.id);
    notificar('Eliminado');
  } else if (modalAbierto.value === 'solicitarSalida' && cursoSalida.value) {
    await solicitudesServicio.crear('salida', { cursoId: cursoSalida.value.id });
    notificar('Solicitud enviada');
  }
  cerrarModal();
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <Encabezado
    :titulo="titulo"
    subtitulo="Un curso existe por si solo; puede o no pertenecer a una ruta."
  >
    <Boton v-if="!esEstudiante" variante="primario" icono="plus" @click="abrirCrear">Nuevo curso</Boton>
  </Encabezado>

  <div v-if="!cargando" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(268px, 1fr)); gap: 14px">
    <TarjetaEntidad
      v-for="(curso, indice) in cursos"
      :key="curso.id"
      icono="book-open"
      :color-inicio="PALETA[indice % PALETA.length][0]"
      :color-fin="PALETA[indice % PALETA.length][1]"
      :titulo="curso.nombre"
      :descripcion="curso.descripcion"
      :metas="
        esEstudiante
          ? [{ icono: 'layers', texto: curso.totalModulos + ' modulos' }, { icono: 'user-round', texto: curso.docente?.nombre ?? 'Sin docente' }]
          : [
              { icono: 'layers', texto: curso.totalModulos + ' modulos' },
              { icono: 'users', texto: curso.totalEstudiantes + ' alumnos' },
              { icono: 'user-round', texto: curso.docente?.nombre ?? 'Sin docente' },
            ]
      "
      :progreso="null"
      :boton-texto="esEstudiante ? 'Continuar' : 'Abrir curso'"
      :boton-icono="esEstudiante ? 'play' : 'arrow-right'"
      :boton-tono="esEstudiante ? 'secundario' : 'primario'"
      :acciones="
        esEstudiante
          ? [{ icono: 'log-out', titulo: 'Solicitar salida', peligro: true, accion: () => abrirSolicitarSalida(curso) }]
          : [
              { icono: 'pencil', titulo: 'Editar', accion: () => abrirEditar(curso) },
              { icono: 'trash-2', titulo: 'Eliminar', peligro: true, accion: () => abrirEliminar(curso) },
            ]
      "
      @abrir="abrirCurso(curso)"
    />
  </div>

  <Modal
    v-if="modalAbierto === 'formulario'"
    :titulo="edicion ? 'Editar curso' : 'Nuevo curso'"
    descripcion="Completa los datos para guardar el registro."
    :icono="edicion ? 'pencil' : 'plus'"
    :etiqueta-confirmar="edicion ? 'Guardar cambios' : 'Crear'"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  >
    <CampoTexto v-model="form.nombre" etiqueta="Nombre del curso" marcador="Matematicas Basicas" />
    <CampoTexto v-model="form.descripcion as string" etiqueta="Descripcion" tipo="area" marcador="De que trata el curso" />
  </Modal>

  <Modal
    v-if="modalAbierto === 'eliminar'"
    titulo="Eliminar curso?"
    :descripcion="`Esta accion elimina «${edicion?.nombre}» y sus modulos. No se puede deshacer.`"
    icono="trash-2"
    peligro
    etiqueta-confirmar="Eliminar"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  />

  <Modal
    v-if="modalAbierto === 'solicitarSalida'"
    titulo="Solicitar salida del curso?"
    :descripcion="`Se enviara una solicitud para darte de baja de «${cursoSalida?.nombre}». El administrador decide.`"
    icono="log-out"
    etiqueta-confirmar="Enviar solicitud"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  />
</template>
