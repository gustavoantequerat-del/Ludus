<script setup lang="ts">
/**
 * Mazos del Memorama y del Mahjong: los iconos que se emparejan, la imagen de
 * la ficha y el fondo de la mesa.
 *
 * Cada imagen se sube apenas se elige y el mazo guarda sus rutas al
 * confirmar. El mazo base de Ludus no se edita: se duplica y se cambia la
 * copia.
 */
import { computed, onMounted, ref } from 'vue';
import estilos from './EditorMazos.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import Modal from '@/componentes/base/Modal.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import { mazosServicio, type DatosMazo } from '@/servicios/mazos.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { leerComoDataUrl, urlArchivo } from '@/utilidades/archivos';
import { mensajeDeError } from '@/utilidades/errores';
import type { ClaveJuegoFichas, Mazo } from '@/tipos';

const props = defineProps<{ juegoClave: ClaveJuegoFichas }>();

/** Lo mismo que valida el servidor: se avisa antes de subir. */
const TIPOS_IMAGEN = ['image/png', 'image/jpeg', 'image/webp'];
const MAXIMO_MB = 3;
const MINIMO_ICONOS = 4;
const MAXIMO_ICONOS = 60;

const TEXTOS = {
  memorama: {
    ficha: 'Dorso de la carta',
    ayudaFicha: 'Lo que se ve de cada carta antes de voltearla. Sin imagen se usa el dorso de Ludus.',
    ayudaIconos: 'Cada icono es una pareja posible. El Memorama necesita al menos tantos iconos como pares por ronda.',
  },
  mahjong: {
    ficha: 'Cuerpo de la ficha',
    ayudaFicha: 'La pieza sobre la que va cada icono. Sin imagen se usa la ficha de marfil de Ludus.',
    ayudaIconos: 'Cada icono aparece en varias fichas. Funcionan mejor cuadrados y con fondo transparente (PNG).',
  },
};

const almacen = useAlmacenAutenticacion();
const { notificar } = usarNotificaciones();

const mazos = ref<Mazo[]>([]);
const cargando = ref(true);
const textos = computed(() => TEXTOS[props.juegoClave]);
const esSuperadmin = computed(() => almacen.usuario?.rol === 'superadmin');

const modalAbierto = ref<'formulario' | 'eliminar' | null>(null);
const edicion = ref<Mazo | null>(null);
const form = ref<DatosMazo>({ nombre: '', iconos: [], imagenFicha: null, fondo: null });
const subiendo = ref(0);

function puedeEditar(mazo: Mazo) {
  return esSuperadmin.value || mazo.institucionId !== null;
}

async function cargar() {
  cargando.value = true;
  mazos.value = await mazosServicio.listar(props.juegoClave);
  cargando.value = false;
}

function abrirCrear() {
  edicion.value = null;
  form.value = { nombre: '', iconos: [], imagenFicha: null, fondo: null };
  modalAbierto.value = 'formulario';
}

function abrirEditar(mazo: Mazo) {
  edicion.value = mazo;
  form.value = {
    nombre: mazo.nombre,
    iconos: [...mazo.iconos],
    imagenFicha: mazo.imagenFicha,
    fondo: mazo.fondo,
  };
  modalAbierto.value = 'formulario';
}

function abrirEliminar(mazo: Mazo) {
  edicion.value = mazo;
  modalAbierto.value = 'eliminar';
}

function cerrarModal() {
  modalAbierto.value = null;
  edicion.value = null;
}

async function duplicar(mazo: Mazo) {
  try {
    const copia = await mazosServicio.duplicar(mazo.id);
    notificar(`Se creo «${copia.nombre}». Editala a tu gusto.`);
    await cargar();
  } catch (error) {
    notificar(mensajeDeError(error, 'No se pudo duplicar'));
  }
}

/** Revisa el archivo antes de subirlo para dar un mensaje claro. */
function problemaDeImagen(archivo: File): string | null {
  if (!TIPOS_IMAGEN.includes(archivo.type)) return `${archivo.name}: solo PNG, JPG o WEBP.`;
  if (archivo.size > MAXIMO_MB * 1024 * 1024) return `${archivo.name}: pesa mas de ${MAXIMO_MB} MB.`;
  return null;
}

async function subir(archivo: File, uso: 'icono' | 'ficha' | 'fondo'): Promise<string | null> {
  const problema = problemaDeImagen(archivo);
  if (problema) {
    notificar(problema);
    return null;
  }
  try {
    return await mazosServicio.subirImagen(await leerComoDataUrl(archivo), uso);
  } catch (error) {
    notificar(mensajeDeError(error, `No se pudo subir ${archivo.name}`));
    return null;
  }
}

async function agregarIconos(evento: Event) {
  const entrada = evento.target as HTMLInputElement;
  const archivos = Array.from(entrada.files ?? []);
  entrada.value = '';
  const lugar = MAXIMO_ICONOS - form.value.iconos.length;
  if (archivos.length > lugar) notificar(`Un mazo tiene como maximo ${MAXIMO_ICONOS} iconos.`);

  subiendo.value = Math.min(archivos.length, lugar);
  for (const archivo of archivos.slice(0, lugar)) {
    const ruta = await subir(archivo, 'icono');
    if (ruta) form.value.iconos.push(ruta);
    subiendo.value -= 1;
  }
}

function quitarIcono(indice: number) {
  form.value.iconos.splice(indice, 1);
}

async function elegirImagen(evento: Event, campo: 'imagenFicha' | 'fondo') {
  const entrada = evento.target as HTMLInputElement;
  const archivo = entrada.files?.[0];
  entrada.value = '';
  if (!archivo) return;
  subiendo.value = 1;
  const ruta = await subir(archivo, campo === 'fondo' ? 'fondo' : 'ficha');
  if (ruta) form.value[campo] = ruta;
  subiendo.value = 0;
}

async function confirmar() {
  try {
    if (modalAbierto.value === 'eliminar' && edicion.value) {
      await mazosServicio.eliminar(edicion.value.id);
      notificar('Mazo eliminado');
    } else if (modalAbierto.value === 'formulario') {
      if (subiendo.value > 0) {
        notificar('Espera a que terminen de subir las imagenes');
        return;
      }
      if (form.value.iconos.length < MINIMO_ICONOS) {
        notificar(`El mazo necesita al menos ${MINIMO_ICONOS} iconos`);
        return;
      }
      if (edicion.value) {
        await mazosServicio.actualizar(edicion.value.id, form.value);
        notificar('Cambios guardados');
      } else {
        await mazosServicio.crear(props.juegoClave, form.value);
        notificar('Mazo creado');
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
      Un mazo es el aspecto del juego: sus iconos, la ficha y el fondo. Cada modulo elige que mazo
      usa al configurar el juego.
    </p>
    <Boton variante="primario" icono="plus" @click="abrirCrear">Nuevo mazo</Boton>
  </div>

  <div v-if="!cargando" :class="estilos.grilla">
    <article v-for="mazo in mazos" :key="mazo.id" :class="estilos.tarjeta">
      <div :class="estilos.muestra" :style="mazo.fondo ? { backgroundImage: `url(${urlArchivo(mazo.fondo)})` } : {}">
        <span
          v-for="icono in mazo.iconos.slice(0, 8)"
          :key="icono"
          :class="[estilos.muestraFicha, juegoClave === 'mahjong' ? estilos.muestraFichaMahjong : '']"
        >
          <img :class="estilos.muestraIcono" :src="urlArchivo(icono)" alt="" />
        </span>
        <span v-if="mazo.institucionId === null" :class="estilos.marcaBase">BASE DE LUDUS</span>
      </div>
      <div :class="estilos.datos">
        <span :class="estilos.nombre">{{ mazo.nombre }}</span>
        <span :class="estilos.detalle">
          {{ mazo.iconos.length }} iconos{{ mazo.imagenFicha ? ' · ficha propia' : '' }}{{ mazo.fondo ? ' · fondo propio' : '' }}
        </span>
      </div>
      <div :class="estilos.acciones">
        <Boton v-if="puedeEditar(mazo)" icono="pencil" @click="abrirEditar(mazo)">Editar</Boton>
        <Boton icono="copy" @click="duplicar(mazo)">Duplicar</Boton>
        <Boton v-if="puedeEditar(mazo)" variante="fantasma" icono="trash-2" @click="abrirEliminar(mazo)" />
      </div>
    </article>
  </div>

  <Modal
    v-if="modalAbierto === 'formulario'"
    :titulo="edicion ? 'Editar mazo' : 'Nuevo mazo'"
    descripcion="Las imagenes se suben al elegirlas; el mazo se guarda al confirmar."
    :icono="edicion ? 'pencil' : 'layout-grid'"
    ancho
    :etiqueta-confirmar="subiendo > 0 ? 'Subiendo...' : edicion ? 'Guardar cambios' : 'Crear mazo'"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  >
    <CampoTexto v-model="form.nombre" etiqueta="Nombre del mazo" marcador="Animales de la granja" />

    <div :class="estilos.seccion">
      <div :class="estilos.seccionCabecera">
        <span :class="estilos.etiqueta">Iconos ({{ form.iconos.length }})</span>
        <label :class="estilos.botonArchivo">
          <Icono nombre="image-plus" :tamano="15" /> Agregar iconos
          <input
            :class="estilos.archivoOculto"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            @change="agregarIconos"
          />
        </label>
      </div>
      <p :class="estilos.ayuda">
        {{ textos.ayudaIconos }} Minimo {{ MINIMO_ICONOS }}. PNG, JPG o WEBP de hasta {{ MAXIMO_MB }} MB.
      </p>
      <div :class="estilos.iconos">
        <div v-for="(icono, indice) in form.iconos" :key="icono + indice" :class="estilos.icono">
          <img :class="estilos.iconoImagen" :src="urlArchivo(icono)" alt="" />
          <button type="button" :class="estilos.quitar" title="Quitar" @click="quitarIcono(indice)">
            <Icono nombre="x" :tamano="12" />
          </button>
        </div>
        <span v-if="subiendo > 0" :class="estilos.subiendo">Subiendo {{ subiendo }}...</span>
      </div>
    </div>

    <div :class="estilos.dosColumnas">
      <div :class="estilos.seccion">
        <span :class="estilos.etiqueta">{{ textos.ficha }}</span>
        <p :class="estilos.ayuda">{{ textos.ayudaFicha }}</p>
        <div :class="estilos.imagenUnica">
          <img v-if="form.imagenFicha" :class="estilos.imagenUnicaPrevia" :src="urlArchivo(form.imagenFicha)" alt="" />
          <span v-else :class="estilos.imagenUnicaVacia">Ludus</span>
          <div :class="estilos.imagenUnicaAcciones">
            <label :class="estilos.botonArchivo">
              <Icono nombre="upload" :tamano="14" /> Subir
              <input :class="estilos.archivoOculto" type="file" accept="image/png,image/jpeg,image/webp" @change="elegirImagen($event, 'imagenFicha')" />
            </label>
            <Boton v-if="form.imagenFicha" variante="fantasma" icono="x" @click="form.imagenFicha = null">Quitar</Boton>
          </div>
        </div>
      </div>

      <div :class="estilos.seccion">
        <span :class="estilos.etiqueta">Fondo de la mesa</span>
        <p :class="estilos.ayuda">Va detras del tablero. Horizontal, idealmente 1600 x 900.</p>
        <div :class="estilos.imagenUnica">
          <img v-if="form.fondo" :class="estilos.imagenUnicaPrevia" :src="urlArchivo(form.fondo)" alt="" />
          <span v-else :class="estilos.imagenUnicaVacia">Ludus</span>
          <div :class="estilos.imagenUnicaAcciones">
            <label :class="estilos.botonArchivo">
              <Icono nombre="upload" :tamano="14" /> Subir
              <input :class="estilos.archivoOculto" type="file" accept="image/png,image/jpeg,image/webp" @change="elegirImagen($event, 'fondo')" />
            </label>
            <Boton v-if="form.fondo" variante="fantasma" icono="x" @click="form.fondo = null">Quitar</Boton>
          </div>
        </div>
      </div>
    </div>
  </Modal>

  <Modal
    v-if="modalAbierto === 'eliminar'"
    titulo="Eliminar mazo?"
    :descripcion="`Se borra «${edicion?.nombre}» y sus imagenes. Si algun modulo lo usa, primero cambia el mazo en su configuracion.`"
    icono="trash-2"
    peligro
    etiqueta-confirmar="Eliminar"
    @cerrar="cerrarModal"
    @confirmar="confirmar"
  />
</template>
