<script setup lang="ts">
/**
 * Casos de la Mesa de Cumplimiento.
 *
 * El docente escribe el expediente que ve el estudiante, elige que CEO lo
 * presenta y marca cual era la decision correcta con su explicacion.
 *
 * Los casos del catalogo base de Ludus se ven pero no se editan: hay que
 * duplicarlos a la institucion. Desde que la institucion tiene casos propios,
 * la partida se arma solo con ellos.
 */
import { computed, onMounted, ref } from 'vue';
import estilos from './EditorCasos.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import Modal from '@/componentes/base/Modal.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import CampoSelector from '@/componentes/base/CampoSelector.vue';
import CampoInterruptor from '@/componentes/base/CampoInterruptor.vue';
import { casosServicio, type DatosCaso } from '@/servicios/casos.servicio';
import { personajesServicio } from '@/servicios/personajes.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { urlArchivo } from '@/utilidades/archivos';
import { mensajeDeError } from '@/utilidades/errores';
import type { CasoEditable, DecisionCumplimiento, Personaje } from '@/tipos';

const almacen = useAlmacenAutenticacion();
const { notificar } = usarNotificaciones();

const DECISIONES: { valor: DecisionCumplimiento; texto: string }[] = [
  { valor: 'aprobar', texto: 'Aprobar' },
  { valor: 'reforzar', texto: 'Aprobar con EDD' },
  { valor: 'rechazar', texto: 'Rechazar' },
];

/** Los seis campos fijos del expediente, en el orden en que se muestran. */
const CAMPOS_EXPEDIENTE: { clave: keyof DatosCaso; etiqueta: string; marcador: string }[] = [
  {
    clave: 'registroLicencia',
    etiqueta: 'Registro / licencia',
    marcador: 'Vigente como Sujeto Obligado (R.A. 19/2025)',
  },
  {
    clave: 'travelRule',
    etiqueta: 'Travel Rule',
    marcador: 'La jurisdiccion la implementa parcialmente; el VASP ya la aplica por politica propia',
  },
  {
    clave: 'beneficiarioFinal',
    etiqueta: 'Beneficiario final',
    marcador: 'Declarado y verificado: 2 socios bolivianos',
  },
  {
    clave: 'controlesAml',
    etiqueta: 'Controles AML',
    marcador: 'Onboarding, screening, monitoreo y KYT documentados',
  },
  { clave: 'sanciones', etiqueta: 'Sanciones', marcador: 'Screening activo; sin coincidencias' },
  {
    clave: 'exposicionOnchain',
    etiqueta: 'Exposicion on-chain',
    marcador: 'Contrapartes identificadas; 6% hacia servicios DeFi',
  },
];

const casos = ref<CasoEditable[]>([]);
const personajes = ref<Personaje[]>([]);
const cargando = ref(true);

/** Casos cuya foto no cargo: el archivo ya no esta en la carpeta. */
const rotas = ref(new Set<string>());

const modalAbierto = ref<'formulario' | 'eliminar' | null>(null);
const edicion = ref<CasoEditable | null>(null);
const form = ref<DatosCaso>(formularioVacio());

const esSuperadmin = computed(() => almacen.usuario?.rol === 'superadmin');
const propios = computed(() => casos.value.filter((caso) => caso.institucionId !== null));
const usaCatalogoBase = computed(() => !esSuperadmin.value && propios.value.length === 0);

/**
 * La lista muestra lo que van a jugar los estudiantes: los casos de la
 * institucion, o el catalogo base mientras no haya propios. Al superadmin,
 * que es quien mantiene ese catalogo, se le muestra todo.
 */
const visibles = computed(() => {
  if (esSuperadmin.value || usaCatalogoBase.value) return casos.value;
  return propios.value;
});

function formularioVacio(): DatosCaso {
  return {
    entidad: '',
    tipo: '',
    jurisdiccion: '',
    solicitud: '',
    registroLicencia: '',
    travelRule: '',
    beneficiarioFinal: '',
    controlesAml: '',
    sanciones: '',
    exposicionOnchain: '',
    camposExtra: [],
    decisionCorrecta: 'aprobar',
    regla: '',
    explicacion: '',
    origen: '',
    personajeId: null,
    activo: true,
  };
}

function puedeEditar(caso: CasoEditable) {
  return esSuperadmin.value || caso.institucionId !== null;
}

function etiquetaDecision(decision: DecisionCumplimiento) {
  return DECISIONES.find((opcion) => opcion.valor === decision)?.texto ?? decision;
}

function tonoDecision(decision: DecisionCumplimiento): 'ok' | 'error' | 'alerta' {
  if (decision === 'aprobar') return 'ok';
  if (decision === 'rechazar') return 'error';
  return 'alerta';
}

function valorCampo(clave: keyof DatosCaso): string {
  return (form.value[clave] as string) ?? '';
}

function asignarCampo(clave: keyof DatosCaso, valor: string) {
  (form.value as Record<string, unknown>)[clave] = valor;
}

async function cargar() {
  cargando.value = true;
  [casos.value, personajes.value] = await Promise.all([
    casosServicio.listar(),
    personajesServicio.listar(),
  ]);
  cargando.value = false;
}

function abrirCrear() {
  edicion.value = null;
  form.value = formularioVacio();
  modalAbierto.value = 'formulario';
}

function abrirEditar(caso: CasoEditable) {
  edicion.value = caso;
  form.value = {
    entidad: caso.entidad,
    tipo: caso.tipo,
    jurisdiccion: caso.jurisdiccion,
    solicitud: caso.solicitud,
    registroLicencia: caso.registroLicencia,
    travelRule: caso.travelRule,
    beneficiarioFinal: caso.beneficiarioFinal,
    controlesAml: caso.controlesAml,
    sanciones: caso.sanciones,
    exposicionOnchain: caso.exposicionOnchain,
    camposExtra: caso.camposExtra.map((campo) => ({ ...campo })),
    decisionCorrecta: caso.decisionCorrecta,
    regla: caso.regla,
    explicacion: caso.explicacion,
    origen: caso.origen,
    personajeId: caso.personajeId,
    activo: caso.activo,
  };
  modalAbierto.value = 'formulario';
}

function abrirEliminar(caso: CasoEditable) {
  edicion.value = caso;
  modalAbierto.value = 'eliminar';
}

function cerrarModal() {
  modalAbierto.value = null;
  edicion.value = null;
}

function agregarExtra() {
  form.value.camposExtra = [...(form.value.camposExtra ?? []), { etiqueta: '', valor: '' }];
}

function quitarExtra(indice: number) {
  form.value.camposExtra = (form.value.camposExtra ?? []).filter((_, i) => i !== indice);
}

async function duplicarBase() {
  const copias = await casosServicio.duplicarBase();
  notificar(`${copias.length} casos copiados a tu institucion`);
  await cargar();
}

async function confirmar() {
  try {
    if (modalAbierto.value === 'eliminar' && edicion.value) {
      await casosServicio.eliminar(edicion.value.id);
      notificar('Caso eliminado');
    } else if (modalAbierto.value === 'formulario') {
      // Los campos extra sin etiqueta no aportan nada al expediente.
      const datos = {
        ...form.value,
        camposExtra: (form.value.camposExtra ?? []).filter((campo) => campo.etiqueta.trim()),
      };
      if (edicion.value) {
        await casosServicio.actualizar(edicion.value.id, datos);
        notificar('Cambios guardados');
      } else {
        await casosServicio.crear(datos);
        notificar('Caso creado');
      }
    }
  } catch (error) {
    // El modal queda abierto para corregir lo que el backend rechazo.
    notificar(mensajeDeError(error));
    return;
  }
  cerrarModal();
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <div :class="estilos.barra">
    <p :class="estilos.barraTexto">
      Cada expediente: que dice cada campo, quien lo presenta y cual era la decision correcta.
    </p>
    <Boton variante="primario" icono="plus" @click="abrirCrear">Nuevo caso</Boton>
  </div>

  <div v-if="!cargando && usaCatalogoBase" :class="estilos.aviso">
    <Icono nombre="info" :tamano="17" />
    <div :class="estilos.avisoTextos">
      <span>
        Tu institucion juega con el catalogo base de Ludus. Duplicalo para poder editarlo: desde
        que tengas casos propios, la mesa se arma solo con los tuyos.
      </span>
      <Boton icono="copy" @click="duplicarBase">Duplicar catalogo base</Boton>
    </div>
  </div>

  <div v-if="!cargando && visibles.length === 0" :class="estilos.vacio">
    Todavia no hay casos cargados.
  </div>

  <div v-else-if="!cargando" :class="estilos.lista">
    <article
      v-for="caso in visibles"
      :key="caso.id"
      :class="[estilos.caso, caso.activo ? '' : estilos.casoInactivo]"
    >
      <span :class="estilos.retrato">
        <img
          v-if="caso.personaje && !rotas.has(caso.id)"
          :class="estilos.retratoImagen"
          :src="urlArchivo(caso.personaje.imagen)"
          :alt="caso.personaje.nombre"
          @error="rotas.add(caso.id)"
        />
        <Icono v-else nombre="user-round" :tamano="18" />
      </span>

      <div :class="estilos.casoTextos">
        <span :class="estilos.entidad">{{ caso.entidad }}</span>
        <span :class="estilos.detalle">{{ caso.tipo }} · {{ caso.jurisdiccion }}</span>
        <span :class="estilos.regla">{{ caso.regla }}</span>
      </div>

      <Insignia :tono="tonoDecision(caso.decisionCorrecta)">
        {{ etiquetaDecision(caso.decisionCorrecta) }}
      </Insignia>
      <Insignia v-if="caso.institucionId === null" tono="neutro">Base</Insignia>
      <Insignia v-if="!caso.activo" tono="neutro">Inactivo</Insignia>

      <div :class="estilos.casoAcciones">
        <Boton
          :icono="puedeEditar(caso) ? 'pencil' : 'lock'"
          :deshabilitado="!puedeEditar(caso)"
          @click="abrirEditar(caso)"
        >
          Editar
        </Boton>
        <Boton
          v-if="puedeEditar(caso)"
          variante="fantasma"
          icono="trash-2"
          @click="abrirEliminar(caso)"
        />
      </div>
    </article>
  </div>

  <Modal
    v-if="modalAbierto === 'formulario'"
    :titulo="edicion ? 'Editar caso' : 'Nuevo caso'"
    descripcion="Lo que escribas aqui es lo que lee el estudiante antes de decidir."
    :icono="edicion ? 'pencil' : 'plus'"
    ancho
    :etiqueta-confirmar="edicion ? 'Guardar cambios' : 'Crear'"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  >
    <div :class="estilos.dosColumnas">
      <CampoTexto v-model="form.entidad" etiqueta="Entidad" marcador="Andes Digital PSAV S.R.L." />
      <CampoTexto
        :model-value="form.tipo ?? ''"
        etiqueta="Tipo"
        marcador="PSAV - intercambio fiat/AV"
        @update:model-value="form.tipo = $event"
      />
      <CampoTexto
        :model-value="form.jurisdiccion ?? ''"
        etiqueta="Jurisdiccion"
        marcador="Bolivia"
        @update:model-value="form.jurisdiccion = $event"
      />
      <CampoTexto
        :model-value="form.solicitud ?? ''"
        etiqueta="Solicitud"
        marcador="Apertura de cuenta corporativa"
        @update:model-value="form.solicitud = $event"
      />
    </div>

    <div :class="estilos.seccion">
      <span :class="estilos.seccionTitulo">CEO que aparece en escena</span>
      <div :class="estilos.personajes">
        <button
          type="button"
          :class="[estilos.opcionPersonaje, form.personajeId === null ? estilos.opcionActiva : '']"
          @click="form.personajeId = null"
        >
          <span :class="estilos.opcionVacia"><Icono nombre="user-round" :tamano="17" /></span>
          <span :class="estilos.opcionNombre">Sin personaje</span>
        </button>
        <button
          v-for="personaje in personajes"
          :key="personaje.id"
          type="button"
          :class="[
            estilos.opcionPersonaje,
            form.personajeId === personaje.id ? estilos.opcionActiva : '',
          ]"
          @click="form.personajeId = personaje.id"
        >
          <img :class="estilos.opcionImagen" :src="urlArchivo(personaje.imagen)" alt="" />
          <span :class="estilos.opcionNombre">{{ personaje.nombre }}</span>
        </button>
      </div>
    </div>

    <div :class="estilos.seccion">
      <span :class="estilos.seccionTitulo">Campos del expediente</span>
      <CampoTexto
        v-for="campo in CAMPOS_EXPEDIENTE"
        :key="campo.clave"
        :model-value="valorCampo(campo.clave)"
        :etiqueta="campo.etiqueta"
        tipo="area"
        :marcador="campo.marcador"
        @update:model-value="asignarCampo(campo.clave, $event)"
      />
      <p :class="estilos.seccionTitulo">Un campo vacio no se muestra en el expediente.</p>
    </div>

    <div :class="estilos.seccion">
      <span :class="estilos.seccionTitulo">Otros datos del caso</span>
      <div v-for="(campo, indice) in form.camposExtra" :key="indice" :class="estilos.filaExtra">
        <CampoTexto v-model="campo.etiqueta" etiqueta="Etiqueta" marcador="Materialidad" />
        <CampoTexto v-model="campo.valor" etiqueta="Valor" marcador="0,2% del volumen total" />
        <Boton variante="fantasma" icono="trash-2" @click="quitarExtra(indice)" />
      </div>
      <Boton icono="plus" @click="agregarExtra">Agregar dato</Boton>
    </div>

    <div :class="estilos.seccion">
      <span :class="estilos.seccionTitulo">Respuesta correcta</span>
      <CampoSelector
        :model-value="form.decisionCorrecta"
        etiqueta="Decision que correspondia"
        :opciones="DECISIONES.map((opcion) => ({ valor: opcion.valor, texto: opcion.texto }))"
        @update:model-value="form.decisionCorrecta = $event as DecisionCumplimiento"
      />
      <CampoTexto
        :model-value="form.regla ?? ''"
        etiqueta="Regla"
        marcador="El enfoque basado en riesgos no excluye por categoria"
        @update:model-value="form.regla = $event"
      />
      <CampoTexto
        :model-value="form.explicacion ?? ''"
        etiqueta="Explicacion"
        tipo="area"
        marcador="Por que esa es la decision correcta"
        @update:model-value="form.explicacion = $event"
      />
      <CampoTexto
        :model-value="form.origen ?? ''"
        etiqueta="Origen en el curso"
        marcador="Modulo 2 - Tema 5: no de-risking automatico"
        @update:model-value="form.origen = $event"
      />
      <CampoInterruptor
        :model-value="form.activo ?? true"
        texto="Incluir este caso en las partidas"
        @update:model-value="form.activo = $event"
      />
    </div>
  </Modal>

  <Modal
    v-if="modalAbierto === 'eliminar'"
    titulo="Eliminar caso?"
    :descripcion="`Se elimina «${edicion?.entidad}». No se puede deshacer.`"
    icono="trash-2"
    peligro
    etiqueta-confirmar="Eliminar"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  />
</template>
