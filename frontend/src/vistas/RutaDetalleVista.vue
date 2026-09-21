<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './RutaDetalleVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import BotonIcono from '@/componentes/base/BotonIcono.vue';
import Icono from '@/componentes/base/Icono.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import Modal from '@/componentes/base/Modal.vue';
import ListaSeleccionable from '@/componentes/base/ListaSeleccionable.vue';
import { rutasServicio } from '@/servicios/rutas.servicio';
import { cursosServicio } from '@/servicios/cursos.servicio';
import { inscripcionesServicio } from '@/servicios/inscripciones.servicio';
import { usuariosServicio } from '@/servicios/usuarios.servicio';
import { resultadosServicio } from '@/servicios/resultados.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { iniciales } from '@/utilidades/texto';
import type { Curso, Inscripcion, Ruta, Usuario } from '@/tipos';

const props = defineProps<{ id: string }>();
const enrutador = useRouter();
const almacen = useAlmacenAutenticacion();
const { notificar } = usarNotificaciones();

const esEstudiante = computed(() => almacen.usuario?.rol === 'estudiante');

const ruta = ref<Ruta | null>(null);
const inscritos = ref<Inscripcion[]>([]);
const completados = ref<Set<string>>(new Set());
const cursosDisponibles = ref<Curso[]>([]);
const candidatosAsignar = ref<Usuario[]>([]);
const seleccionAsignar = ref<string[]>([]);
const cursoAAgregar = ref('');

const modalAbierto = ref<'asignar' | 'agregarCurso' | 'quitarCurso' | null>(null);
const cursoAQuitar = ref<string | null>(null);

function estadoCurso(cursoId: string): 'ok' | 'info' | 'neutro' {
  if (completados.value.has(cursoId)) return 'ok';
  return 'neutro';
}

async function cargar() {
  ruta.value = await rutasServicio.obtener(props.id);
  if (esEstudiante.value) {
    const resultados = await resultadosServicio.listar();
    const porCurso = new Map<string, Set<string>>();
    resultados.forEach((r) => {
      const cid = r.modulo.cursoId;
      if (!porCurso.has(cid)) porCurso.set(cid, new Set());
      porCurso.get(cid)!.add(r.moduloId);
    });
    completados.value = new Set(
      (ruta.value?.cursos ?? [])
        .filter((rc) => (porCurso.get(rc.cursoId)?.size ?? 0) >= (rc.curso.totalModulos || 1))
        .map((rc) => rc.cursoId),
    );
  } else {
    inscritos.value = await inscripcionesServicio.deRuta(props.id);
  }
}

async function abrirAsignar() {
  candidatosAsignar.value = await usuariosServicio.listar('estudiante');
  seleccionAsignar.value = inscritos.value.map((i) => i.estudianteId);
  modalAbierto.value = 'asignar';
}

async function abrirAgregarCurso() {
  const todos = await cursosServicio.listar();
  const idsEnRuta = new Set((ruta.value?.cursos ?? []).map((rc) => rc.cursoId));
  cursosDisponibles.value = todos.filter(
    (c) => c.institucionId === ruta.value?.institucionId && !idsEnRuta.has(c.id),
  );
  cursoAAgregar.value = cursosDisponibles.value[0]?.id ?? '';
  modalAbierto.value = 'agregarCurso';
}

function abrirQuitarCurso(cursoId: string) {
  cursoAQuitar.value = cursoId;
  modalAbierto.value = 'quitarCurso';
}

function cerrarModal() {
  modalAbierto.value = null;
  cursoAQuitar.value = null;
}

async function confirmar() {
  if (modalAbierto.value === 'asignar') {
    await inscripcionesServicio.asignarARuta(props.id, seleccionAsignar.value);
    notificar(`${seleccionAsignar.value.length} estudiantes asignados`);
  } else if (modalAbierto.value === 'agregarCurso' && cursoAAgregar.value) {
    await rutasServicio.agregarCurso(props.id, cursoAAgregar.value);
    notificar('Curso agregado a la ruta');
  } else if (modalAbierto.value === 'quitarCurso' && cursoAQuitar.value) {
    await rutasServicio.quitarCurso(props.id, cursoAQuitar.value);
    notificar('Curso quitado de la ruta');
  }
  cerrarModal();
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <template v-if="ruta">
    <Encabezado
      :titulo="ruta.nombre"
      :subtitulo="ruta.descripcion"
      miga-de-returno="Rutas"
      @volver="enrutador.push({ name: 'rutas' })"
    >
      <Boton v-if="!esEstudiante" variante="primario" icono="plus" @click="abrirAgregarCurso">Agregar curso</Boton>
    </Encabezado>

    <div :class="estilos.columna">
      <div :class="estilos.panel">
        <div :class="estilos.panelCabecera">
          <Icono nombre="route" :tamano="17" />
          <h3 :class="estilos.panelTitulo">Secuencia de cursos</h3>
        </div>
        <div v-for="(rc, indice) in ruta.cursos" :key="rc.id" :class="estilos.fila">
          <div :class="estilos.punto">{{ indice + 1 }}</div>
          <div :class="estilos.textos">
            <span :class="estilos.nombre">{{ rc.curso.nombre }}</span>
            <span :class="estilos.meta">{{ rc.curso.totalModulos }} modulos · {{ rc.curso.docente?.nombre ?? 'Sin docente' }}</span>
          </div>
          <Insignia v-if="esEstudiante" :tono="estadoCurso(rc.cursoId)">
            {{ completados.has(rc.cursoId) ? 'Completado' : 'No iniciado' }}
          </Insignia>
          <Insignia v-else tono="neutro">{{ rc.curso.totalEstudiantes }} alumnos</Insignia>
          <div :class="estilos.acciones">
            <Boton variante="primario" icono="arrow-right" @click="enrutador.push({ name: 'curso-detalle', params: { id: rc.cursoId } })">
              Abrir
            </Boton>
            <BotonIcono v-if="!esEstudiante" icono="x" titulo="Quitar de la ruta" peligro @click="abrirQuitarCurso(rc.cursoId)" />
          </div>
        </div>
      </div>

      <div v-if="!esEstudiante" :class="estilos.panel">
        <div :class="estilos.panelCabecera">
          <Icono nombre="users" :tamano="17" />
          <h3 :class="estilos.panelTitulo">Estudiantes en la ruta</h3>
          <Boton style="margin-left: auto" variante="secundario" icono="user-plus" @click="abrirAsignar">Asignar</Boton>
        </div>
        <div :class="estilos.estudiantes">
          <span v-for="i in inscritos" :key="i.id" :class="estilos.chipEstudiante">
            <span :class="estilos.chipAvatar">{{ iniciales(i.estudiante.nombre) }}</span>{{ i.estudiante.nombre }}
          </span>
        </div>
      </div>
    </div>
  </template>

  <Modal
    v-if="modalAbierto === 'asignar'"
    titulo="Asignar estudiantes"
    :descripcion="`Selecciona quien queda inscrito en ${ruta?.nombre}.`"
    icono="user-plus"
    etiqueta-confirmar="Guardar asignacion"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  >
    <ListaSeleccionable
      v-model="seleccionAsignar"
      :opciones="candidatosAsignar.map((u) => ({ id: u.id, texto: u.nombre, sub: u.correo }))"
    />
  </Modal>

  <Modal
    v-if="modalAbierto === 'agregarCurso'"
    titulo="Agregar curso a la ruta"
    descripcion="Elige un curso existente de la misma institucion."
    icono="plus"
    etiqueta-confirmar="Agregar"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  >
    <ListaSeleccionable
      :model-value="cursoAAgregar ? [cursoAAgregar] : []"
      :opciones="cursosDisponibles.map((c) => ({ id: c.id, texto: c.nombre }))"
      @update:model-value="(v) => (cursoAAgregar = v[v.length - 1] ?? '')"
    />
  </Modal>

  <Modal
    v-if="modalAbierto === 'quitarCurso'"
    titulo="Quitar curso de la ruta?"
    descripcion="El curso seguira existiendo por su cuenta; solo sale de esta ruta."
    icono="x"
    peligro
    etiqueta-confirmar="Quitar"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  />
</template>
