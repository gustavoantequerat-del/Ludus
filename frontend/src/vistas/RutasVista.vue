<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import TarjetaEntidad from '@/componentes/base/TarjetaEntidad.vue';
import Modal from '@/componentes/base/Modal.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import CampoSelector from '@/componentes/base/CampoSelector.vue';
import { rutasServicio, type DatosRuta } from '@/servicios/rutas.servicio';
import { institucionesServicio } from '@/servicios/instituciones.servicio';
import { mensajeDeError } from '@/utilidades/errores';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import type { Institucion, Ruta } from '@/tipos';

const enrutador = useRouter();
const almacen = useAlmacenAutenticacion();
const { notificar } = usarNotificaciones();

const esEstudiante = computed(() => almacen.usuario?.rol === 'estudiante');
const titulo = computed(() => (esEstudiante.value ? 'Mis rutas' : 'Rutas de cursos'));

const PALETA = [
  ['var(--secundario)', 'var(--primario)'],
  ['var(--terciario)', 'var(--secundario)'],
  ['var(--primario)', 'var(--terciario)'],
];

const rutas = ref<Ruta[]>([]);
const cargando = ref(true);

const modalAbierto = ref<'formulario' | 'eliminar' | null>(null);
const edicion = ref<Ruta | null>(null);
const form = ref<DatosRuta>({ nombre: '', descripcion: '' });
const esSuperadmin = computed(() => almacen.usuario?.rol === 'superadmin');
const instituciones = ref<Institucion[]>([]);

async function cargar() {
  cargando.value = true;
  rutas.value = await rutasServicio.listar();
  cargando.value = false;
}

function abrirRuta(ruta: Ruta) {
  enrutador.push({ name: 'ruta-detalle', params: { id: ruta.id } });
}
async function abrirCrear() {
  edicion.value = null;
  if (esSuperadmin.value && !instituciones.value.length) instituciones.value = await institucionesServicio.listar();
  form.value = { nombre: '', descripcion: '', institucionId: esSuperadmin.value ? instituciones.value[0]?.id : undefined };
  modalAbierto.value = 'formulario';
}
function abrirEditar(ruta: Ruta) {
  edicion.value = ruta;
  form.value = { nombre: ruta.nombre, descripcion: ruta.descripcion };
  modalAbierto.value = 'formulario';
}
function abrirEliminar(ruta: Ruta) {
  edicion.value = ruta;
  modalAbierto.value = 'eliminar';
}
function cerrarModal() {
  modalAbierto.value = null;
  edicion.value = null;
}
async function confirmar() {
  try {
    if (modalAbierto.value === 'formulario') {
      if (edicion.value) {
        await rutasServicio.actualizar(edicion.value.id, { nombre: form.value.nombre, descripcion: form.value.descripcion });
        notificar('Cambios guardados');
      } else {
        await rutasServicio.crear(form.value);
        notificar('Ruta creada');
      }
    } else if (modalAbierto.value === 'eliminar' && edicion.value) {
      await rutasServicio.eliminar(edicion.value.id);
      notificar('Eliminado');
    }
  } catch (fallo) {
    notificar(mensajeDeError(fallo));
    return;
  }
  cerrarModal();
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <Encabezado :titulo="titulo" subtitulo="Una ruta es una secuencia ordenada de cursos que ya existen.">
    <Boton v-if="!esEstudiante" variante="primario" icono="plus" @click="abrirCrear">Nueva ruta</Boton>
  </Encabezado>

  <div v-if="!cargando" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(268px, 1fr)); gap: 14px">
    <TarjetaEntidad
      v-for="(ruta, indice) in rutas"
      :key="ruta.id"
      icono="route"
      :color-inicio="PALETA[indice % PALETA.length][0]"
      :color-fin="PALETA[indice % PALETA.length][1]"
      :titulo="ruta.nombre"
      :descripcion="ruta.descripcion"
      :etiqueta="ruta.cursos.length + ' cursos'"
      :metas="[
        { icono: 'book-open', texto: ruta.cursos.length + ' cursos' },
        { icono: 'users', texto: ruta.totalEstudiantes + ' estudiantes' },
      ]"
      :progreso="null"
      :boton-texto="esEstudiante ? 'Ver ruta' : 'Abrir ruta'"
      boton-icono="arrow-right"
      boton-tono="primario"
      :acciones="
        esEstudiante
          ? []
          : [
              { icono: 'pencil', titulo: 'Editar', accion: () => abrirEditar(ruta) },
              { icono: 'trash-2', titulo: 'Eliminar', peligro: true, accion: () => abrirEliminar(ruta) },
            ]
      "
      @abrir="abrirRuta(ruta)"
    />
  </div>

  <Modal
    v-if="modalAbierto === 'formulario'"
    :titulo="edicion ? 'Editar ruta' : 'Nueva ruta'"
    descripcion="Completa los datos para guardar el registro."
    :icono="edicion ? 'pencil' : 'plus'"
    :etiqueta-confirmar="edicion ? 'Guardar cambios' : 'Crear'"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  >
    <CampoTexto v-model="form.nombre" etiqueta="Nombre de la ruta" marcador="Matematicas Iniciales" />
    <CampoTexto v-model="form.descripcion as string" etiqueta="Descripcion" tipo="area" marcador="Que recorrido cubre" />
    <CampoSelector
      v-if="esSuperadmin && !edicion"
      :model-value="form.institucionId ?? ''"
      etiqueta="Institucion"
      :opciones="instituciones.map((i) => ({ valor: i.id, texto: i.nombre }))"
      @update:model-value="(v) => (form.institucionId = v)"
    />
  </Modal>

  <Modal
    v-if="modalAbierto === 'eliminar'"
    titulo="Eliminar ruta?"
    :descripcion="`Esta accion elimina «${edicion?.nombre}». No se puede deshacer.`"
    icono="trash-2"
    peligro
    etiqueta-confirmar="Eliminar"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  />
</template>
