<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import Tabla from '@/componentes/base/Tabla.vue';
import CeldaPersona from '@/componentes/base/CeldaPersona.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import BotonIcono from '@/componentes/base/BotonIcono.vue';
import Modal from '@/componentes/base/Modal.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import CampoSelector from '@/componentes/base/CampoSelector.vue';
import { usuariosServicio, type DatosUsuario } from '@/servicios/usuarios.servicio';
import { institucionesServicio } from '@/servicios/instituciones.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { etiquetaRol } from '@/utilidades/texto';
import type { Institucion, Rol, Usuario } from '@/tipos';

const ruta = useRoute();
const almacen = useAlmacenAutenticacion();
const { notificar } = usarNotificaciones();

const filtroRolFijo = ruta.meta.filtroRolFijo as Rol | undefined;
const soloLectura = almacen.usuario?.rol === 'docente';

const usuarios = ref<Usuario[]>([]);
const instituciones = ref<Institucion[]>([]);
const busqueda = ref('');
const filtroRol = ref<Rol | 'todos'>(filtroRolFijo ?? 'todos');
const cargando = ref(true);

const modalAbierto = ref<'formulario' | 'eliminar' | null>(null);
const edicion = ref<Usuario | null>(null);
const form = ref<DatosUsuario>({ nombre: '', correo: '', clave: '', rol: 'estudiante' });

const titulo = computed(() => {
  if (filtroRolFijo === 'docente') return 'Docentes';
  if (filtroRolFijo === 'estudiante') return 'Estudiantes';
  return 'Usuarios';
});

const rolesCreables = computed<Rol[]>(() =>
  almacen.usuario?.rol === 'superadmin' ? ['admin_institucion', 'docente', 'estudiante'] : ['docente', 'estudiante'],
);

const columnas = computed(() => [
  { etiqueta: 'Nombre', flex: 1.9 },
  ...(filtroRolFijo ? [] : [{ etiqueta: 'Rol', flex: 1.1 }]),
  { etiqueta: 'Institucion', flex: 0.9 },
  { etiqueta: 'Estado', flex: 0.8 },
]);

const filtrados = computed(() =>
  usuarios.value
    .filter((u) => filtroRolFijo || filtroRol.value === 'todos' || u.rol === filtroRol.value)
    .filter(
      (u) =>
        u.nombre.toLowerCase().includes(busqueda.value.toLowerCase()) ||
        u.correo.toLowerCase().includes(busqueda.value.toLowerCase()),
    ),
);

async function cargar() {
  cargando.value = true;
  const [listaUsuarios, listaInstituciones] = await Promise.all([
    usuariosServicio.listar(filtroRolFijo),
    almacen.usuario?.rol === 'superadmin' ? institucionesServicio.listar() : Promise.resolve([]),
  ]);
  usuarios.value = listaUsuarios;
  instituciones.value = listaInstituciones;
  cargando.value = false;
}

function abrirCrear() {
  edicion.value = null;
  form.value = {
    nombre: '',
    correo: '',
    clave: '',
    rol: filtroRolFijo ?? rolesCreables.value[0],
    institucionId: instituciones.value[0]?.id,
  };
  modalAbierto.value = 'formulario';
}
function abrirEditar(usuario: Usuario) {
  edicion.value = usuario;
  form.value = {
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    institucionId: usuario.institucionId ?? undefined,
    activo: usuario.activo,
  };
  modalAbierto.value = 'formulario';
}
function abrirEliminar(usuario: Usuario) {
  edicion.value = usuario;
  modalAbierto.value = 'eliminar';
}
function cerrarModal() {
  modalAbierto.value = null;
  edicion.value = null;
}

async function confirmar() {
  if (modalAbierto.value === 'formulario') {
    if (edicion.value) {
      const { clave, ...resto } = form.value;
      await usuariosServicio.actualizar(edicion.value.id, resto);
      notificar('Cambios guardados');
    } else {
      await usuariosServicio.crear(form.value);
      notificar('Registro creado');
    }
  } else if (modalAbierto.value === 'eliminar' && edicion.value) {
    await usuariosServicio.eliminar(edicion.value.id);
    notificar('Eliminado');
  }
  cerrarModal();
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <Encabezado :titulo="titulo" subtitulo="Usuarios con su rol y alcance institucional.">
    <Boton v-if="!soloLectura" variante="primario" icono="plus" @click="abrirCrear">Nuevo usuario</Boton>
  </Encabezado>

  <Tabla v-if="!cargando" :columnas="columnas" :items="filtrados" v-model:busqueda="busqueda">
    <template #filtros v-if="!filtroRolFijo">
      <CampoSelector
        :model-value="filtroRol"
        etiqueta=""
        :opciones="[
          { valor: 'todos', texto: 'Todos' },
          { valor: 'admin_institucion', texto: 'Admin institucion' },
          { valor: 'docente', texto: 'Docente' },
          { valor: 'estudiante', texto: 'Estudiante' },
        ]"
        @update:model-value="(v) => (filtroRol = v as Rol | 'todos')"
      />
    </template>
    <template #fila="{ item }">
      <div style="flex: 1.9; min-width: 0">
        <CeldaPersona :nombre="item.nombre" :detalle="item.correo" />
      </div>
      <div v-if="!filtroRolFijo" style="flex: 1.1">
        <Insignia :tono="item.rol === 'docente' ? 'info' : item.rol === 'estudiante' ? 'primario' : 'alerta'">
          {{ etiquetaRol(item.rol) }}
        </Insignia>
      </div>
      <div style="flex: 0.9">{{ item.institucion?.nombre ?? 'Global' }}</div>
      <div style="flex: 0.8">
        <Insignia :tono="item.activo ? 'ok' : 'neutro'">{{ item.activo ? 'Activo' : 'Inactivo' }}</Insignia>
      </div>
      <div style="flex: none; display: flex; gap: 6px; margin-left: auto">
        <template v-if="!soloLectura">
          <BotonIcono icono="pencil" titulo="Editar" @click="abrirEditar(item)" />
          <BotonIcono icono="trash-2" titulo="Eliminar" peligro @click="abrirEliminar(item)" />
        </template>
      </div>
    </template>
  </Tabla>

  <Modal
    v-if="modalAbierto === 'formulario'"
    :titulo="edicion ? 'Editar usuario' : 'Nuevo usuario'"
    descripcion="Completa los datos para guardar el registro."
    :icono="edicion ? 'pencil' : 'plus'"
    :etiqueta-confirmar="edicion ? 'Guardar cambios' : 'Crear'"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  >
    <CampoTexto v-model="form.nombre" etiqueta="Nombre" marcador="Nombre y apellido" />
    <CampoTexto v-model="form.correo" etiqueta="Correo" marcador="correo@institucion.mx" />
    <CampoTexto
      v-if="!edicion"
      :model-value="form.clave ?? ''"
      etiqueta="Contrasena"
      tipo="clave"
      marcador="Minimo 6 caracteres"
      @update:model-value="(v) => (form.clave = v)"
    />
    <CampoSelector
      v-if="!filtroRolFijo"
      v-model="form.rol"
      etiqueta="Rol"
      :opciones="rolesCreables.map((r) => ({ valor: r, texto: etiquetaRol(r) }))"
    />
    <CampoSelector
      v-if="almacen.usuario?.rol === 'superadmin'"
      v-model="form.institucionId as string"
      etiqueta="Institucion"
      :opciones="instituciones.map((i) => ({ valor: i.id, texto: i.nombre }))"
    />
    <CampoSelector
      v-if="edicion"
      :model-value="form.activo ? 'activo' : 'inactivo'"
      etiqueta="Estado"
      :opciones="[{ valor: 'activo', texto: 'Activo' }, { valor: 'inactivo', texto: 'Inactivo' }]"
      @update:model-value="(v) => (form.activo = v === 'activo')"
    />
  </Modal>

  <Modal
    v-if="modalAbierto === 'eliminar'"
    titulo="Eliminar usuario?"
    :descripcion="`Esta accion elimina a «${edicion?.nombre}». No se puede deshacer.`"
    icono="trash-2"
    peligro
    etiqueta-confirmar="Eliminar"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  />
</template>
