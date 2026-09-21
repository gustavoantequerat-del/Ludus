<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import Tabla from '@/componentes/base/Tabla.vue';
import CeldaPersona from '@/componentes/base/CeldaPersona.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import BotonIcono from '@/componentes/base/BotonIcono.vue';
import Modal from '@/componentes/base/Modal.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import CampoSelector from '@/componentes/base/CampoSelector.vue';
import { institucionesServicio, type DatosInstitucion } from '@/servicios/instituciones.servicio';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import type { Institucion } from '@/tipos';

const { notificar } = usarNotificaciones();

const instituciones = ref<Institucion[]>([]);
const busqueda = ref('');
const cargando = ref(true);

const modalAbierto = ref<'formulario' | 'eliminar' | null>(null);
const edicion = ref<Institucion | null>(null);
const form = ref<DatosInstitucion>({ nombre: '', dominio: '', activa: true });

const columnas = [
  { etiqueta: 'Institucion', flex: 1.8 },
  { etiqueta: 'Docentes', flex: 0.8 },
  { etiqueta: 'Estudiantes', flex: 0.9 },
  { etiqueta: 'Estado', flex: 0.9 },
];

const filtradas = computed(() =>
  instituciones.value.filter((i) => i.nombre.toLowerCase().includes(busqueda.value.toLowerCase())),
);

async function cargar() {
  cargando.value = true;
  instituciones.value = await institucionesServicio.listar();
  cargando.value = false;
}

function abrirCrear() {
  edicion.value = null;
  form.value = { nombre: '', dominio: '', activa: true };
  modalAbierto.value = 'formulario';
}
function abrirEditar(institucion: Institucion) {
  edicion.value = institucion;
  form.value = { nombre: institucion.nombre, dominio: institucion.dominio, activa: institucion.activa };
  modalAbierto.value = 'formulario';
}
function abrirEliminar(institucion: Institucion) {
  edicion.value = institucion;
  modalAbierto.value = 'eliminar';
}
function cerrarModal() {
  modalAbierto.value = null;
  edicion.value = null;
}

async function confirmar() {
  if (modalAbierto.value === 'formulario') {
    if (edicion.value) {
      await institucionesServicio.actualizar(edicion.value.id, form.value);
      notificar('Cambios guardados');
    } else {
      await institucionesServicio.crear(form.value);
      notificar('Registro creado');
    }
  } else if (modalAbierto.value === 'eliminar' && edicion.value) {
    await institucionesServicio.eliminar(edicion.value.id);
    notificar('Eliminado');
  }
  cerrarModal();
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <Encabezado
    titulo="Instituciones"
    subtitulo="Cada institucion mantiene sus usuarios, cursos y rutas aislados."
  >
    <Boton variante="primario" icono="plus" @click="abrirCrear">Nueva institucion</Boton>
  </Encabezado>

  <Tabla
    v-if="!cargando"
    :columnas="columnas"
    :items="filtradas"
    v-model:busqueda="busqueda"
  >
    <template #fila="{ item }">
      <div style="flex: 1.8; min-width: 0">
        <CeldaPersona :nombre="item.nombre" :detalle="item.dominio" />
      </div>
      <div style="flex: 0.8">{{ item.totalDocentes }}</div>
      <div style="flex: 0.9">{{ item.totalEstudiantes }}</div>
      <div style="flex: 0.9">
        <Insignia :tono="item.activa ? 'ok' : 'neutro'">{{ item.activa ? 'Activa' : 'Inactiva' }}</Insignia>
      </div>
      <div style="flex: none; display: flex; gap: 6px; margin-left: auto">
        <BotonIcono icono="pencil" titulo="Editar" @click="abrirEditar(item)" />
        <BotonIcono icono="trash-2" titulo="Eliminar" peligro @click="abrirEliminar(item)" />
      </div>
    </template>
  </Tabla>

  <Modal
    v-if="modalAbierto === 'formulario'"
    :titulo="edicion ? 'Editar institucion' : 'Nueva institucion'"
    descripcion="Completa los datos para guardar el registro."
    :icono="edicion ? 'pencil' : 'plus'"
    :etiqueta-confirmar="edicion ? 'Guardar cambios' : 'Crear'"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  >
    <CampoTexto v-model="form.nombre" etiqueta="Nombre de la institucion" marcador="NEXUM" />
    <CampoTexto v-model="form.dominio" etiqueta="Dominio" marcador="nexum.edu.mx" />
    <CampoSelector
      :model-value="form.activa ? 'activa' : 'inactiva'"
      etiqueta="Estado"
      :opciones="[{ valor: 'activa', texto: 'Activa' }, { valor: 'inactiva', texto: 'Inactiva' }]"
      @update:model-value="(v) => (form.activa = v === 'activa')"
    />
  </Modal>

  <Modal
    v-if="modalAbierto === 'eliminar'"
    titulo="Eliminar institucion?"
    :descripcion="`Esta accion elimina «${edicion?.nombre}» y todo lo que dependa de ella. No se puede deshacer.`"
    icono="trash-2"
    peligro
    etiqueta-confirmar="Eliminar"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  />
</template>
