<script setup lang="ts">
/**
 * Bancos de preguntas del Ajedrez de Preguntas.
 *
 * Cada pregunta tiene cuatro opciones y una correcta, y puede marcarse como
 * dificil: las dificiles salen siempre que un rey entra en la captura (y
 * tambien pueden salir en una captura normal). El banco trae ademas las reglas
 * de la partida: minutos (0 = sin limite) y el minimo X de preguntas para
 * calificar sin modo examen.
 */
import { computed, onMounted, ref } from 'vue';
import estilos from './EditorAjedrez.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import Modal from '@/componentes/base/Modal.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import { ajedrezServicio, type DatosBancoAjedrez } from '@/servicios/ajedrez.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { mensajeDeError } from '@/utilidades/errores';
import type { BancoAjedrez, PreguntaBancoAjedrez } from '@/tipos';

/** Lo que pide el juego para que un banco se pueda elegir en un modulo. */
const MINIMO_PREGUNTAS = 10;
const LETRAS = ['A', 'B', 'C', 'D'];

const almacen = useAlmacenAutenticacion();
const { notificar } = usarNotificaciones();

const bancos = ref<BancoAjedrez[]>([]);
const cargando = ref(true);
const esSuperadmin = computed(() => almacen.usuario?.rol === 'superadmin');

/** null: se ve la lista. Un banco (o 'nuevo'): se ve el editor. */
const editando = ref<BancoAjedrez | 'nuevo' | null>(null);
const form = ref<DatosBancoAjedrez>({ nombre: '', minutos: 15, minimoPreguntas: 5, preguntas: [] });
const guardando = ref(false);
const aEliminar = ref<BancoAjedrez | null>(null);

const faltan = computed(() =>
  Math.max(0, Math.max(MINIMO_PREGUNTAS, form.value.minimoPreguntas) - form.value.preguntas.length),
);
const dificiles = computed(() => form.value.preguntas.filter((p) => p.dificil).length);

/** Preguntas que le faltan para jugarse: al menos 10 y al menos el minimo X. */
function faltanDe(banco: BancoAjedrez) {
  return Math.max(0, Math.max(MINIMO_PREGUNTAS, banco.minimoPreguntas) - banco.preguntas.length);
}

function puedeEditar(banco: BancoAjedrez) {
  return esSuperadmin.value || banco.institucionId !== null;
}

function preguntaVacia(): PreguntaBancoAjedrez {
  return { texto: '', opciones: ['', '', '', ''], correcta: 0, dificil: false };
}

async function cargar() {
  cargando.value = true;
  bancos.value = await ajedrezServicio.listarBancos();
  cargando.value = false;
}

function abrirNuevo() {
  form.value = { nombre: '', minutos: 15, minimoPreguntas: 5, preguntas: [preguntaVacia()] };
  editando.value = 'nuevo';
}

function abrirEditar(banco: BancoAjedrez) {
  form.value = {
    nombre: banco.nombre,
    minutos: banco.minutos,
    minimoPreguntas: banco.minimoPreguntas,
    preguntas: banco.preguntas.map((p) => ({
      id: p.id,
      texto: p.texto,
      opciones: p.opciones.map((o) => o.texto),
      correcta: Math.max(0, p.opciones.findIndex((o) => o.id === p.correctaId)),
      dificil: p.dificil,
    })),
  };
  editando.value = banco;
}

function numero(evento: Event, minimo: number, maximo: number): number {
  const valor = Math.round(Number((evento.target as HTMLInputElement).value));
  return Number.isFinite(valor) ? Math.min(maximo, Math.max(minimo, valor)) : minimo;
}

function primerError(): string | null {
  const f = form.value;
  if (f.nombre.trim().length < 2) return 'Ponle un nombre al banco';
  const incompleta = f.preguntas.findIndex((p) => !p.texto.trim() || p.opciones.some((o) => !o.trim()));
  if (incompleta >= 0) return `A la pregunta ${incompleta + 1} le falta el texto o alguna de sus 4 opciones`;
  const repetida = f.preguntas.findIndex(
    (p) => new Set(p.opciones.map((o) => o.trim().toLowerCase())).size < 4,
  );
  if (repetida >= 0) return `La pregunta ${repetida + 1} tiene opciones repetidas`;
  return null;
}

async function guardar() {
  const error = primerError();
  if (error) {
    notificar(error);
    return;
  }
  guardando.value = true;
  try {
    if (editando.value === 'nuevo') {
      await ajedrezServicio.crearBanco(form.value);
    } else if (editando.value) {
      await ajedrezServicio.actualizarBanco(editando.value.id, form.value);
    }
    notificar(
      faltan.value
        ? `Banco guardado. Le faltan ${faltan.value} pregunta(s) para poder jugarse`
        : 'Banco guardado',
    );
    editando.value = null;
    await cargar();
  } catch (fallo) {
    notificar(mensajeDeError(fallo));
  } finally {
    guardando.value = false;
  }
}

async function eliminar() {
  if (!aEliminar.value) return;
  try {
    await ajedrezServicio.eliminarBanco(aEliminar.value.id);
    notificar('Banco eliminado');
  } catch (fallo) {
    notificar(mensajeDeError(fallo));
    return;
  }
  aEliminar.value = null;
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <!-- Lista -->
  <template v-if="!editando">
    <div :class="estilos.barra">
      <p :class="estilos.barraTexto">
        Cada vez que dos piezas chocan sale una pregunta de este banco. Si el estudiante acierta, su pieza
        sobrevive; si falla, la comida es la suya. Las preguntas dificiles salen cuando un rey captura.
      </p>
      <Boton variante="primario" icono="plus" @click="abrirNuevo">Nuevo banco</Boton>
    </div>

    <div v-if="!cargando && bancos.length === 0" :class="estilos.vacio">
      Todavia no hay bancos. Crea el primero con al menos {{ MINIMO_PREGUNTAS }} preguntas.
    </div>

    <div v-else-if="!cargando" :class="estilos.grilla">
      <article v-for="banco in bancos" :key="banco.id" :class="estilos.tarjeta">
        <div :class="estilos.tarjetaCabecera">
          <span :class="estilos.tarjetaIcono"><Icono nombre="crown" :tamano="17" /></span>
          <div :class="estilos.tarjetaTextos">
            <span :class="estilos.nombre">{{ banco.nombre }}</span>
            <span :class="estilos.detalle">
              {{ banco.preguntas.length }} pregunta(s) · {{ banco.minutos ? `${banco.minutos} min` : 'sin limite' }} ·
              minimo {{ banco.minimoPreguntas }}
            </span>
          </div>
        </div>
        <Insignia v-if="faltanDe(banco) === 0" tono="ok">Listo para jugar</Insignia>
        <span v-else :class="estilos.aviso">
          <Icono nombre="alert-triangle" :tamano="13" />
          Le faltan {{ faltanDe(banco) }} pregunta(s)
        </span>
        <span v-if="banco.institucionId === null" :class="estilos.detalle">Catalogo base de Ludus</span>
        <div v-if="puedeEditar(banco)" :class="estilos.acciones">
          <Boton icono="pencil" @click="abrirEditar(banco)">Editar</Boton>
          <Boton variante="fantasma" icono="trash-2" @click="aEliminar = banco" />
        </div>
      </article>
    </div>
  </template>

  <!-- Editor de un banco -->
  <template v-else>
    <div :class="estilos.barra">
      <Boton variante="fantasma" icono="arrow-left" @click="editando = null">Volver a bancos</Boton>
    </div>

    <div :class="estilos.limites">
      <Icono nombre="info" :tamano="16" />
      <span>
        Minimo <strong>{{ MINIMO_PREGUNTAS }} preguntas</strong>, cada una con 4 opciones y una correcta (marca el
        circulo). Las marcadas como <strong>dificiles</strong> salen cuando un rey captura; si captura el rey del
        estudiante y falla, pierde la partida. Si no marcas ninguna, sale cualquiera.
      </span>
    </div>

    <div :class="estilos.panel">
      <CampoTexto v-model="form.nombre" etiqueta="Nombre del banco" marcador="Repaso de fracciones" />
      <div :class="estilos.reglas">
        <label :class="estilos.numero">
          <span :class="estilos.numeroEtiqueta">Tiempo de partida (minutos, 0 = sin limite)</span>
          <input
            :class="estilos.numeroEntrada"
            type="number"
            min="0"
            max="180"
            :value="form.minutos"
            @change="form.minutos = numero($event, 0, 180)"
          />
        </label>
        <label :class="estilos.numero">
          <span :class="estilos.numeroEtiqueta">Minimo de preguntas X (si salen menos, modo examen)</span>
          <input
            :class="estilos.numeroEntrada"
            type="number"
            min="1"
            max="50"
            :value="form.minimoPreguntas"
            @change="form.minimoPreguntas = numero($event, 1, 50)"
          />
        </label>
      </div>
      <p :class="estilos.ayuda">
        Si se acaba el tiempo (o termina la partida) y al estudiante le salieron menos de X preguntas, responde las
        que faltan en modo examen. La nota es la parte de preguntas respondidas bien.
      </p>
    </div>

    <div v-for="(pregunta, indice) in form.preguntas" :key="indice" :class="estilos.panel">
      <div :class="estilos.preguntaCabecera">
        <span :class="estilos.preguntaNumero">Pregunta {{ indice + 1 }}</span>
        <div :class="estilos.preguntaAcciones">
          <label :class="estilos.dificil">
            <input v-model="pregunta.dificil" type="checkbox" />
            Dificil
          </label>
          <Boton variante="fantasma" icono="trash-2" @click="form.preguntas.splice(indice, 1)" />
        </div>
      </div>
      <CampoTexto v-model="pregunta.texto" etiqueta="Pregunta" tipo="area" marcador="Cuanto es 3/4 + 1/4?" />
      <div :class="estilos.opcionesPregunta">
        <label
          v-for="(_, o) in pregunta.opciones"
          :key="o"
          :class="[estilos.opcion, pregunta.correcta === o ? estilos.opcionCorrecta : '']"
        >
          <input
            :class="estilos.opcionMarca"
            type="radio"
            :name="`correcta-${indice}`"
            :checked="pregunta.correcta === o"
            :title="`Marcar la opcion ${LETRAS[o]} como correcta`"
            @change="pregunta.correcta = o"
          />
          <input
            v-model="pregunta.opciones[o]"
            :class="estilos.opcionEntrada"
            type="text"
            maxlength="160"
            :placeholder="`Opcion ${LETRAS[o]}${o === pregunta.correcta ? ' (correcta)' : ''}`"
          />
        </label>
      </div>
    </div>

    <div :class="estilos.pie">
      <Boton icono="plus" @click="form.preguntas.push(preguntaVacia())">Agregar pregunta</Boton>
      <span :class="[estilos.contador, faltan ? estilos.contadorFalta : '']">
        {{ form.preguntas.length }} pregunta(s), {{ dificiles }} dificil(es)
        <template v-if="faltan"> · faltan {{ faltan }} para jugarse</template>
      </span>
      <span :class="estilos.espaciador" />
      <Boton variante="secundario" @click="editando = null">Cancelar</Boton>
      <Boton variante="primario" icono="save" :deshabilitado="guardando" @click="guardar">Guardar banco</Boton>
    </div>
  </template>

  <Modal
    v-if="aEliminar"
    titulo="Eliminar banco?"
    :descripcion="`Se borra «${aEliminar.nombre}». Si algun modulo lo usa, primero elige otro en su configuracion.`"
    icono="trash-2"
    peligro
    etiqueta-confirmar="Eliminar"
    @cerrar="aEliminar = null"
    @confirmar="eliminar"
  />
</template>
