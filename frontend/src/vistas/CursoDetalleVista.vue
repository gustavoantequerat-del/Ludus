<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './CursoDetalleVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import BotonIcono from '@/componentes/base/BotonIcono.vue';
import Icono from '@/componentes/base/Icono.vue';
import Modal from '@/componentes/base/Modal.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import CampoInterruptor from '@/componentes/base/CampoInterruptor.vue';
import ListaSeleccionable from '@/componentes/base/ListaSeleccionable.vue';
import { cursosServicio, type DatosModulo, type DatosCurso } from '@/servicios/cursos.servicio';
import { inscripcionesServicio } from '@/servicios/inscripciones.servicio';
import { usuariosServicio } from '@/servicios/usuarios.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { iniciales } from '@/utilidades/texto';
import type { Curso, Inscripcion, ModuloCurso, Usuario } from '@/tipos';

const props = defineProps<{ id: string }>();
const enrutador = useRouter();
const almacen = useAlmacenAutenticacion();
const { notificar } = usarNotificaciones();

const esEstudiante = computed(() => almacen.usuario?.rol === 'estudiante');

const curso = ref<Curso | null>(null);
const inscritos = ref<Inscripcion[]>([]);
const cargando = ref(true);

const modalAbierto = ref<'curso' | 'modulo' | 'eliminarModulo' | 'asignar' | null>(null);
const moduloEdicion = ref<ModuloCurso | null>(null);
const formCurso = ref<DatosCurso>({ nombre: '', descripcion: '' });
const formModulo = ref<DatosModulo>({ titulo: '', descripcion: '', califica: true });
const candidatosAsignar = ref<Usuario[]>([]);
const seleccionAsignar = ref<string[]>([]);

async function cargar() {
  cargando.value = true;
  curso.value = await cursosServicio.obtener(props.id);
  if (!esEstudiante.value) {
    inscritos.value = await inscripcionesServicio.deCurso(props.id);
  }
  cargando.value = false;
}

function abrirEditarCurso() {
  if (!curso.value) return;
  formCurso.value = { nombre: curso.value.nombre, descripcion: curso.value.descripcion };
  modalAbierto.value = 'curso';
}
function abrirCrearModulo() {
  moduloEdicion.value = null;
  formModulo.value = { titulo: '', descripcion: '', califica: true };
  modalAbierto.value = 'modulo';
}
function abrirEditarModulo(modulo: ModuloCurso) {
  moduloEdicion.value = modulo;
  formModulo.value = { titulo: modulo.titulo, descripcion: modulo.descripcion, califica: modulo.califica };
  modalAbierto.value = 'modulo';
}
function abrirEliminarModulo(modulo: ModuloCurso) {
  moduloEdicion.value = modulo;
  modalAbierto.value = 'eliminarModulo';
}
async function abrirAsignar() {
  candidatosAsignar.value = await usuariosServicio.listar('estudiante');
  seleccionAsignar.value = inscritos.value.map((i) => i.estudianteId);
  modalAbierto.value = 'asignar';
}
function cerrarModal() {
  modalAbierto.value = null;
  moduloEdicion.value = null;
}

async function confirmar() {
  if (modalAbierto.value === 'curso') {
    await cursosServicio.actualizar(props.id, formCurso.value);
    notificar('Cambios guardados');
  } else if (modalAbierto.value === 'modulo') {
    if (moduloEdicion.value) {
      await cursosServicio.actualizarModulo(props.id, moduloEdicion.value.id, formModulo.value);
      notificar('Cambios guardados');
    } else {
      await cursosServicio.crearModulo(props.id, formModulo.value);
      notificar('Registro creado');
    }
  } else if (modalAbierto.value === 'eliminarModulo' && moduloEdicion.value) {
    await cursosServicio.eliminarModulo(props.id, moduloEdicion.value.id);
    notificar('Eliminado');
  } else if (modalAbierto.value === 'asignar') {
    await inscripcionesServicio.asignarACurso(props.id, seleccionAsignar.value);
    notificar(`${seleccionAsignar.value.length} estudiantes asignados`);
  }
  cerrarModal();
  await cargar();
}

async function mover(modulo: ModuloCurso, direccion: 'arriba' | 'abajo') {
  await cursosServicio.moverModulo(props.id, modulo.id, direccion);
  await cargar();
}

function irAConfigurar(modulo: ModuloCurso) {
  enrutador.push({ name: 'configurar-juego', params: { cursoId: props.id, moduloId: modulo.id } });
}
function irAJugar(modulo: ModuloCurso) {
  enrutador.push({ name: 'jugar', params: { cursoId: props.id, moduloId: modulo.id } });
}

onMounted(cargar);
</script>

<template>
  <template v-if="curso">
    <Encabezado
      :titulo="curso.nombre"
      :subtitulo="curso.descripcion"
      miga-de-returno="Cursos"
      @volver="enrutador.push({ name: 'cursos' })"
    >
      <template v-if="!esEstudiante">
        <Boton variante="secundario" icono="pencil" @click="abrirEditarCurso">Editar curso</Boton>
        <Boton variante="primario" icono="plus" @click="abrirCrearModulo">Nuevo modulo</Boton>
      </template>
    </Encabezado>

    <div :class="estilos.columna">
      <div :class="estilos.etiquetas">
        <span :class="estilos.etiqueta"><Icono nombre="user-round-cog" :tamano="13" />Docente: {{ curso.docente?.nombre ?? 'Sin asignar' }}</span>
        <span :class="estilos.etiqueta"><Icono nombre="layers" :tamano="13" />{{ curso.totalModulos }} modulos</span>
        <span :class="estilos.etiqueta"><Icono nombre="users" :tamano="13" />{{ curso.totalEstudiantes }} estudiantes</span>
      </div>

      <div :class="estilos.panel">
        <div :class="estilos.panelCabecera">
          <Icono nombre="layers" :tamano="17" />
          <h3 :class="estilos.panelTitulo">Modulos</h3>
          <span :class="estilos.pista">{{ esEstudiante ? 'completa los modulos en orden' : 'usa las flechas para reordenar' }}</span>
        </div>
        <div v-for="(modulo, indice) in curso.modulos" :key="modulo.id" :class="estilos.modulo">
          <div :class="estilos.orden">{{ indice + 1 }}</div>
          <div :class="estilos.moduloTextos">
            <span :class="estilos.moduloTitulo">{{ modulo.titulo }}</span>
            <span :class="estilos.moduloDesc">{{ modulo.descripcion }}</span>
          </div>
          <div :class="[estilos.juegoChip, !modulo.configuracionJuego ? estilos.juegoChipVacio : '']">
            <Icono :nombre="modulo.configuracionJuego?.juego.icono ?? 'circle-slash'" :tamano="15" />
            <div :class="estilos.juegoChipTextos">
              <span :class="estilos.juegoChipNombre">{{ modulo.configuracionJuego?.juego.nombre ?? 'Sin juego' }}</span>
              <span :class="estilos.juegoChipGrado">{{ modulo.califica ? 'Genera calificacion' : 'Sin calificacion' }}</span>
            </div>
          </div>
          <div :class="estilos.acciones">
            <template v-if="esEstudiante">
              <Boton variante="primario" icono="play" @click="irAJugar(modulo)">Jugar</Boton>
            </template>
            <template v-else>
              <BotonIcono icono="chevron-up" titulo="Subir" @click="mover(modulo, 'arriba')" />
              <BotonIcono icono="chevron-down" titulo="Bajar" @click="mover(modulo, 'abajo')" />
              <BotonIcono
                :icono="modulo.configuracionJuego ? 'sliders-horizontal' : 'gamepad-2'"
                :texto="modulo.configuracionJuego ? 'Configurar' : 'Elegir juego'"
                titulo="Configurar juego"
                relleno
                @click="irAConfigurar(modulo)"
              />
              <BotonIcono icono="pencil" titulo="Editar modulo" @click="abrirEditarModulo(modulo)" />
              <BotonIcono icono="trash-2" titulo="Eliminar" peligro @click="abrirEliminarModulo(modulo)" />
            </template>
          </div>
        </div>
      </div>

      <div v-if="!esEstudiante" :class="estilos.panel">
        <div :class="estilos.panelCabecera">
          <Icono nombre="users" :tamano="17" />
          <h3 :class="estilos.panelTitulo">Estudiantes inscritos</h3>
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
    v-if="modalAbierto === 'curso'"
    titulo="Editar curso"
    descripcion="Modifica los datos y guarda los cambios."
    icono="pencil"
    etiqueta-confirmar="Guardar cambios"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  >
    <CampoTexto v-model="formCurso.nombre" etiqueta="Nombre del curso" />
    <CampoTexto v-model="formCurso.descripcion as string" etiqueta="Descripcion" tipo="area" />
  </Modal>

  <Modal
    v-if="modalAbierto === 'modulo'"
    :titulo="moduloEdicion ? 'Editar modulo' : 'Nuevo modulo'"
    descripcion="Completa los datos para guardar el registro."
    :icono="moduloEdicion ? 'pencil' : 'plus'"
    :etiqueta-confirmar="moduloEdicion ? 'Guardar cambios' : 'Crear'"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  >
    <CampoTexto v-model="formModulo.titulo" etiqueta="Titulo del modulo" marcador="Sumas basicas" />
    <CampoTexto v-model="formModulo.descripcion as string" etiqueta="Descripcion breve" tipo="area" marcador="Que se practica aqui" />
    <CampoInterruptor v-model="formModulo.califica as boolean" texto="Este modulo genera calificacion" />
  </Modal>

  <Modal
    v-if="modalAbierto === 'eliminarModulo'"
    titulo="Eliminar modulo?"
    :descripcion="`Esta accion elimina «${moduloEdicion?.titulo}» y su configuracion de juego. No se puede deshacer.`"
    icono="trash-2"
    peligro
    etiqueta-confirmar="Eliminar"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  />

  <Modal
    v-if="modalAbierto === 'asignar'"
    titulo="Asignar estudiantes"
    :descripcion="`Selecciona quien queda inscrito en ${curso?.nombre}.`"
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
</template>
