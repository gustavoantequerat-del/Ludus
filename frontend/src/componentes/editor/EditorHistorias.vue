<script setup lang="ts">
/**
 * Historias del Runner Narrativo.
 *
 * Una historia es una intro y una cadena de preguntas. Cada pregunta tiene una
 * respuesta correcta y una incorrecta, y un video para cada una: si el
 * estudiante acierta ve el bueno y pasa a la siguiente; si falla ve el malo y
 * la partida termina. El orden de la lista es el orden en que se juega.
 */
import { computed, onMounted, ref } from 'vue';
import estilos from './EditorHistorias.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import Modal from '@/componentes/base/Modal.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import CampoLinkVideo from './CampoLinkVideo.vue';
import { historiasServicio, type DatosHistoria } from '@/servicios/historias.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { mensajeDeError } from '@/utilidades/errores';
import type { Historia, PreguntaHistoria } from '@/tipos';

const almacen = useAlmacenAutenticacion();
const { notificar } = usarNotificaciones();

const historias = ref<Historia[]>([]);
const cargando = ref(true);
const esSuperadmin = computed(() => almacen.usuario?.rol === 'superadmin');

/** null: se ve la lista. Una historia (o 'nueva'): se ve el editor. */
const editando = ref<Historia | 'nueva' | null>(null);
const form = ref<DatosHistoria>({ nombre: '', videoIntro: null, preguntas: [] });
const guardando = ref(false);
const aEliminar = ref<Historia | null>(null);

function puedeEditar(historia: Historia) {
  return esSuperadmin.value || historia.institucionId !== null;
}

/** Lo que le falta a una historia para jugarse completa. */
function faltantes(historia: DatosHistoria): string[] {
  const lista: string[] = [];
  if (historia.preguntas.length === 0) lista.push('no tiene preguntas');
  if (!historia.videoIntro) lista.push('falta la intro');
  const sinVideo = historia.preguntas.filter((p) => !p.videoBueno || !p.videoMalo).length;
  if (sinVideo > 0) lista.push(`${sinVideo} pregunta(s) sin sus dos videos`);
  return lista;
}

function preguntaVacia(): PreguntaHistoria {
  return { texto: '', respuestaCorrecta: '', respuestaIncorrecta: '', videoBueno: null, videoMalo: null };
}

async function cargar() {
  cargando.value = true;
  historias.value = await historiasServicio.listar();
  cargando.value = false;
}

function abrirNueva() {
  form.value = { nombre: '', videoIntro: null, preguntas: [preguntaVacia()] };
  editando.value = 'nueva';
}

function abrirEditar(historia: Historia) {
  form.value = {
    nombre: historia.nombre,
    videoIntro: historia.videoIntro,
    preguntas: historia.preguntas.map((p) => ({
      id: p.id,
      texto: p.texto,
      respuestaCorrecta: p.respuestaCorrecta,
      respuestaIncorrecta: p.respuestaIncorrecta,
      videoBueno: p.videoBueno,
      videoMalo: p.videoMalo,
    })),
  };
  editando.value = historia;
}

function mover(indice: number, paso: -1 | 1) {
  const lista = form.value.preguntas;
  const destino = indice + paso;
  if (destino < 0 || destino >= lista.length) return;
  [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
}

function primerError(): string | null {
  if (form.value.nombre.trim().length < 2) return 'Ponle un nombre a la historia';
  const incompleta = form.value.preguntas.findIndex(
    (p) => !p.texto.trim() || !p.respuestaCorrecta.trim() || !p.respuestaIncorrecta.trim(),
  );
  if (incompleta >= 0) return `A la pregunta ${incompleta + 1} le falta el texto o una respuesta`;
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
    if (editando.value === 'nueva') {
      await historiasServicio.crear(form.value);
    } else if (editando.value) {
      await historiasServicio.actualizar(editando.value.id, form.value);
    }
    const pendientes = faltantes(form.value);
    notificar(pendientes.length ? `Historia guardada, pero ${pendientes.join(' y ')}` : 'Historia guardada');
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
    await historiasServicio.eliminar(aEliminar.value.id);
    notificar('Historia eliminada');
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
        Cada historia empieza con una intro y sigue pregunta por pregunta. Si el estudiante acierta,
        ve el video bueno y llega la siguiente; si falla, ve el malo y pierde.
      </p>
      <Boton variante="primario" icono="plus" @click="abrirNueva">Nueva historia</Boton>
    </div>

    <div v-if="!cargando && historias.length === 0" :class="estilos.vacio">
      Todavia no hay historias. Crea la primera: sube una intro y arma la cadena de preguntas.
    </div>

    <div v-else-if="!cargando" :class="estilos.grilla">
      <article v-for="historia in historias" :key="historia.id" :class="estilos.tarjeta">
        <div :class="estilos.tarjetaCabecera">
          <span :class="estilos.tarjetaIcono"><Icono nombre="clapperboard" :tamano="17" /></span>
          <div :class="estilos.tarjetaTextos">
            <span :class="estilos.nombre">{{ historia.nombre }}</span>
            <span :class="estilos.detalle">{{ historia.preguntas.length }} pregunta(s)</span>
          </div>
        </div>
        <Insignia v-if="faltantes(historia).length === 0" tono="ok">Lista para jugar</Insignia>
        <span v-else :class="estilos.aviso">
          <Icono nombre="alert-triangle" :tamano="13" />
          {{ faltantes(historia).join(', ') }}
        </span>
        <div v-if="puedeEditar(historia)" :class="estilos.acciones">
          <Boton icono="pencil" @click="abrirEditar(historia)">Editar</Boton>
          <Boton variante="fantasma" icono="trash-2" @click="aEliminar = historia" />
        </div>
      </article>
    </div>
  </template>

  <!-- Editor de una historia -->
  <template v-else>
    <div :class="estilos.barra">
      <Boton variante="fantasma" icono="arrow-left" @click="editando = null">Volver a historias</Boton>
    </div>

    <div :class="estilos.limites">
      <Icono nombre="info" :tamano="16" />
      <span>
        Los videos no se suben a Ludus: subelos a <strong>YouTube</strong> (como "No listado") o a
        <strong>Google Drive</strong> (compartido como "Cualquier persona con el enlace") y pega aqui el link.
        Con YouTube la historia avanza sola al terminar cada video; con Drive el estudiante pulsa "Continuar".
        Usa videos cortos: de 5 a 15 segundos funciona mejor.
      </span>
    </div>

    <div :class="estilos.panel">
      <CampoTexto v-model="form.nombre" etiqueta="Nombre de la historia" marcador="La carrera del compliance" />
      <CampoLinkVideo
        v-model="form.videoIntro"
        etiqueta="Intro"
        ayuda="Lo primero que ve el estudiante: presenta la historia. Al terminar llega la pregunta 1."
      />
    </div>

    <div v-for="(pregunta, indice) in form.preguntas" :key="indice" :class="estilos.panel">
      <div :class="estilos.preguntaCabecera">
        <span :class="estilos.preguntaNumero">Pregunta {{ indice + 1 }}</span>
        <div :class="estilos.preguntaAcciones">
          <Boton variante="fantasma" icono="arrow-up" :deshabilitado="indice === 0" @click="mover(indice, -1)" />
          <Boton
            variante="fantasma"
            icono="arrow-down"
            :deshabilitado="indice === form.preguntas.length - 1"
            @click="mover(indice, 1)"
          />
          <Boton variante="fantasma" icono="trash-2" @click="form.preguntas.splice(indice, 1)" />
        </div>
      </div>

      <CampoTexto v-model="pregunta.texto" etiqueta="Pregunta" tipo="area" marcador="Que hace el corredor al ver la senal roja?" />
      <div :class="estilos.dosColumnas">
        <CampoTexto v-model="pregunta.respuestaCorrecta" etiqueta="Respuesta correcta" marcador="Se detiene" />
        <CampoTexto v-model="pregunta.respuestaIncorrecta" etiqueta="Respuesta incorrecta" marcador="Acelera" />
      </div>
      <p :class="estilos.ayuda">El estudiante ve las dos respuestas en orden al azar.</p>
      <div :class="estilos.dosColumnas">
        <CampoLinkVideo
          v-model="pregunta.videoBueno"
          etiqueta="Si acierta"
          :ayuda="indice === form.preguntas.length - 1 ? 'Al terminar, gana la historia.' : `Al terminar, llega la pregunta ${indice + 2}.`"
          tono="bueno"
        />
        <CampoLinkVideo
          v-model="pregunta.videoMalo"
          etiqueta="Si falla"
          ayuda="Al terminar, la partida se acaba."
          tono="malo"
        />
      </div>
    </div>

    <div :class="estilos.pie">
      <Boton icono="plus" @click="form.preguntas.push(preguntaVacia())">Agregar pregunta</Boton>
      <span :class="estilos.espaciador" />
      <Boton variante="secundario" @click="editando = null">Cancelar</Boton>
      <Boton variante="primario" icono="save" :deshabilitado="guardando" @click="guardar">
        Guardar historia
      </Boton>
    </div>
  </template>

  <Modal
    v-if="aEliminar"
    titulo="Eliminar historia?"
    :descripcion="`Se borra «${aEliminar.nombre}» (los videos siguen en YouTube o Drive). Si algun modulo la usa, primero elige otra en su configuracion.`"
    icono="trash-2"
    peligro
    etiqueta-confirmar="Eliminar"
    @cerrar="aEliminar = null"
    @confirmar="eliminar"
  />
</template>
