<script setup lang="ts">
/**
 * Personajes del juego: los CEO que aparecen en escena.
 *
 * Hay dos formas de sumar uno y las dos terminan igual, en un registro con su
 * imagen: elegir una de las que ya estan en la carpeta del servidor, o subir
 * un archivo desde la computadora.
 */
import { computed, onMounted, ref } from 'vue';
import estilos from './EditorPersonajes.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import Modal from '@/componentes/base/Modal.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import { personajesServicio, type DatosPersonaje } from '@/servicios/personajes.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { leerComoDataUrl, urlArchivo } from '@/utilidades/archivos';
import { mensajeDeError } from '@/utilidades/errores';
import type { Personaje } from '@/tipos';

const almacen = useAlmacenAutenticacion();
const { notificar } = usarNotificaciones();

const personajes = ref<Personaje[]>([]);
const disponibles = ref<string[]>([]);
const cargando = ref(true);

/**
 * Imagenes que no cargaron: el archivo pudo moverse o borrarse de la carpeta
 * despues de registrar el personaje. Mejor decirlo que dejar el icono roto.
 */
const rotas = ref(new Set<string>());

const modalAbierto = ref<'formulario' | 'eliminar' | null>(null);
const edicion = ref<Personaje | null>(null);
const form = ref<DatosPersonaje>({ nombre: '', cargo: '' });
const previaSubida = ref('');

const esSuperadmin = computed(() => almacen.usuario?.rol === 'superadmin');

/** El catalogo base solo lo edita el superadmin. */
function puedeEditar(personaje: Personaje) {
  return esSuperadmin.value || personaje.institucionId !== null;
}

async function cargar() {
  cargando.value = true;
  [personajes.value, disponibles.value] = await Promise.all([
    personajesServicio.listar(),
    personajesServicio.disponibles(),
  ]);
  cargando.value = false;
}

function abrirCrear() {
  edicion.value = null;
  form.value = { nombre: '', cargo: '' };
  previaSubida.value = '';
  modalAbierto.value = 'formulario';
}

function abrirEditar(personaje: Personaje) {
  edicion.value = personaje;
  form.value = { nombre: personaje.nombre, cargo: personaje.cargo };
  previaSubida.value = '';
  modalAbierto.value = 'formulario';
}

function abrirEliminar(personaje: Personaje) {
  edicion.value = personaje;
  modalAbierto.value = 'eliminar';
}

function cerrarModal() {
  modalAbierto.value = null;
  edicion.value = null;
}

function elegirExistente(ruta: string) {
  form.value.imagenExistente = form.value.imagenExistente === ruta ? undefined : ruta;
  form.value.imagenSubida = undefined;
  previaSubida.value = '';
}

async function elegirArchivo(evento: Event) {
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  if (!archivo) return;
  form.value.imagenSubida = await leerComoDataUrl(archivo);
  form.value.imagenExistente = undefined;
  previaSubida.value = form.value.imagenSubida;
}

async function confirmar() {
  // Si el backend rechaza (falta imagen, pesa de mas), se avisa y el modal
  // queda abierto para corregir, en vez de cerrarse sin guardar nada.
  try {
    if (modalAbierto.value === 'eliminar' && edicion.value) {
      await personajesServicio.eliminar(edicion.value.id);
      notificar('Personaje eliminado');
    } else if (modalAbierto.value === 'formulario') {
      if (edicion.value) {
        await personajesServicio.actualizar(edicion.value.id, form.value);
        notificar('Cambios guardados');
      } else {
        await personajesServicio.crear(form.value);
        notificar('Personaje creado');
      }
    }
  } catch (error) {
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
      Quien aparece en escena a presentar el expediente. Se asignan a cada caso desde la
      pestana Casos.
    </p>
    <Boton variante="primario" icono="plus" @click="abrirCrear">Nuevo personaje</Boton>
  </div>

  <div v-if="!cargando && personajes.length === 0" :class="estilos.vacio">
    Todavia no hay personajes. Crea uno con una imagen del servidor o subiendo una foto.
  </div>

  <div v-else-if="!cargando" :class="estilos.grilla">
    <article v-for="personaje in personajes" :key="personaje.id" :class="estilos.tarjeta">
      <div :class="estilos.retrato">
        <img
          v-if="!rotas.has(personaje.id)"
          :class="estilos.imagen"
          :src="urlArchivo(personaje.imagen)"
          :alt="personaje.nombre"
          @error="rotas.add(personaje.id)"
        />
        <span v-else :class="estilos.sinImagen">
          <Icono nombre="image-off" :tamano="20" />
          Falta el archivo
        </span>
        <span v-if="personaje.institucionId === null" :class="estilos.marcaBase">CATALOGO BASE</span>
      </div>
      <div :class="estilos.datos">
        <span :class="estilos.nombre">{{ personaje.nombre }}</span>
        <span :class="estilos.cargo">{{ personaje.cargo || 'Sin cargo' }}</span>
      </div>
      <div v-if="puedeEditar(personaje)" :class="estilos.acciones">
        <Boton icono="pencil" @click="abrirEditar(personaje)">Editar</Boton>
        <Boton variante="fantasma" icono="trash-2" @click="abrirEliminar(personaje)" />
      </div>
    </article>
  </div>

  <Modal
    v-if="modalAbierto === 'formulario'"
    :titulo="edicion ? 'Editar personaje' : 'Nuevo personaje'"
    descripcion="La imagen se muestra de cuerpo medio frente al jugador."
    :icono="edicion ? 'pencil' : 'user-round-plus'"
    ancho
    :etiqueta-confirmar="edicion ? 'Guardar cambios' : 'Crear'"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  >
    <CampoTexto v-model="form.nombre" etiqueta="Nombre" marcador="Ana Quispe" />
    <CampoTexto
      :model-value="form.cargo ?? ''"
      etiqueta="Cargo"
      marcador="CEO de Andes Digital"
      @update:model-value="form.cargo = $event"
    />

    <div v-if="edicion" :class="estilos.previa">
      <img :class="estilos.previaImagen" :src="urlArchivo(edicion.imagen)" alt="Imagen actual" />
      <span :class="estilos.previaTexto">
        Imagen actual. Elige otra abajo solo si quieres reemplazarla.
      </span>
    </div>

    <div v-if="disponibles.length > 0" :class="estilos.selector">
      <span :class="estilos.etiqueta">Imagenes disponibles en el servidor</span>
      <div :class="estilos.tiras">
        <button
          v-for="ruta in disponibles"
          :key="ruta"
          type="button"
          :class="[estilos.tira, form.imagenExistente === ruta ? estilos.tiraActiva : '']"
          @click="elegirExistente(ruta)"
        >
          <img :class="estilos.tiraImagen" :src="urlArchivo(ruta)" alt="" />
        </button>
      </div>
    </div>

    <div :class="estilos.selector">
      <span :class="estilos.etiqueta">O subir una imagen</span>
      <input :class="estilos.archivo" type="file" accept="image/png,image/jpeg,image/webp" @change="elegirArchivo" />
      <p :class="estilos.ayuda">
        PNG con fondo transparente, vertical y de medio cuerpo. Maximo 3 MB.
      </p>
    </div>

    <div v-if="previaSubida" :class="estilos.previa">
      <img :class="estilos.previaImagen" :src="previaSubida" alt="Imagen elegida" />
      <span :class="estilos.previaTexto">
        <Icono nombre="check" :tamano="14" /> Lista para subir
      </span>
    </div>
  </Modal>

  <Modal
    v-if="modalAbierto === 'eliminar'"
    titulo="Eliminar personaje?"
    :descripcion="`Los casos que usaban a «${edicion?.nombre}» quedan sin personaje, pero se siguen jugando.`"
    icono="trash-2"
    peligro
    etiqueta-confirmar="Eliminar"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  />
</template>
