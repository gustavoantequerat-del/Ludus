<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './ConfiguracionJuegoVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import CampoSelector from '@/componentes/base/CampoSelector.vue';
import CampoRango from '@/componentes/base/CampoRango.vue';
import CampoInterruptor from '@/componentes/base/CampoInterruptor.vue';
import { juegosServicio, type DatosConfiguracionJuego } from '@/servicios/juegos.servicio';
import { cursosServicio } from '@/servicios/cursos.servicio';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import type { Juego, Velocidad } from '@/tipos';

const props = defineProps<{ cursoId: string; moduloId: string }>();
const enrutador = useRouter();
const { notificar } = usarNotificaciones();

const catalogo = ref<Juego[]>([]);
const nombreModulo = ref('');
const califica = ref(true);
const cargando = ref(true);

const form = ref<DatosConfiguracionJuego>({
  juegoId: '',
  titulo: '',
  instrucciones: '',
  velocidad: 'media',
  tiempoLimiteSegundos: 180,
  paresContenido: 8,
  intentosPermitidos: 3,
  puntajeMaximo: 100,
});

const juegoSeleccionado = computed(() => catalogo.value.find((j) => j.id === form.value.juegoId) ?? null);
const tiempoEtiqueta = computed(() => {
  const m = Math.floor(form.value.tiempoLimiteSegundos / 60);
  const s = String(form.value.tiempoLimiteSegundos % 60).padStart(2, '0');
  return `${m}:${s}`;
});

async function cargar() {
  cargando.value = true;
  const [juegos, curso, configuracion] = await Promise.all([
    juegosServicio.listarCatalogo(),
    cursosServicio.obtener(props.cursoId),
    juegosServicio.obtenerConfiguracion(props.moduloId),
  ]);
  catalogo.value = juegos;
  const modulo = curso.modulos.find((m) => m.id === props.moduloId);
  nombreModulo.value = modulo?.titulo ?? '';
  califica.value = modulo?.califica ?? true;

  if (configuracion) {
    form.value = {
      juegoId: configuracion.juegoId,
      titulo: configuracion.titulo,
      instrucciones: configuracion.instrucciones,
      velocidad: configuracion.velocidad,
      tiempoLimiteSegundos: configuracion.tiempoLimiteSegundos,
      paresContenido: configuracion.paresContenido,
      intentosPermitidos: configuracion.intentosPermitidos,
      puntajeMaximo: configuracion.puntajeMaximo,
    };
  } else {
    form.value.juegoId = juegos[0]?.id ?? '';
    form.value.titulo = nombreModulo.value;
    form.value.instrucciones = juegos[0]?.descripcion ?? '';
  }
  cargando.value = false;
}

function elegirPlantilla(juego: Juego) {
  form.value.juegoId = juego.id;
  if (!form.value.titulo) form.value.titulo = juego.nombre;
}

function volver() {
  enrutador.push({ name: 'curso-detalle', params: { id: props.cursoId } });
}

async function guardar() {
  await juegosServicio.configurar(props.moduloId, { ...form.value, califica: califica.value });
  notificar('Configuracion guardada');
  volver();
}

onMounted(cargar);
</script>

<template>
  <Encabezado
    :titulo="'Configurar ' + (juegoSeleccionado?.nombre ?? '')"
    subtitulo="Elige la plantilla y ajusta los parametros del modulo."
    miga-de-returno="Volver"
    @volver="volver"
  />

  <div v-if="!cargando" :class="estilos.cuadricula">
    <div :class="estilos.panel">
      <div :class="estilos.panelCabecera">
        <Icono nombre="gamepad-2" :tamano="17" />
        <h3 :class="estilos.panelTitulo">Plantilla de juego</h3>
      </div>
      <div :class="estilos.plantillas">
        <button
          v-for="juego in catalogo"
          :key="juego.id"
          type="button"
          :class="[estilos.plantilla, form.juegoId === juego.id ? estilos.plantillaActiva : '']"
          @click="elegirPlantilla(juego)"
        >
          <span :class="estilos.plantillaIcono" style="background: var(--primario)">
            <Icono :nombre="juego.icono" :tamano="16" />
          </span>
          <span :class="estilos.plantillaNombre">{{ juego.nombre }}</span>
          <span :class="estilos.plantillaTagline">{{ juego.eslogan }}</span>
        </button>
      </div>
    </div>

    <div :class="estilos.panel">
      <div :class="estilos.panelCabecera">
        <Icono nombre="sliders-horizontal" :tamano="17" />
        <h3 :class="estilos.panelTitulo">Parametros</h3>
      </div>
      <CampoTexto v-model="form.titulo" etiqueta="Titulo del juego" />
      <CampoTexto v-model="form.instrucciones as string" etiqueta="Instrucciones para el estudiante" tipo="area" />
      <CampoSelector
        v-model="form.velocidad"
        etiqueta="Velocidad"
        :opciones="[
          { valor: 'baja', texto: 'Baja' },
          { valor: 'media', texto: 'Media' },
          { valor: 'alta', texto: 'Alta' },
        ]"
      />
      <CampoRango v-model="form.tiempoLimiteSegundos" etiqueta="Tiempo limite (segundos)" :min="30" :max="600" unidad=" s" />
      <CampoRango v-model="form.paresContenido" etiqueta="Pares de contenido" :min="4" :max="24" />
      <CampoRango v-model="form.intentosPermitidos" etiqueta="Intentos permitidos" :min="1" :max="5" />
      <CampoRango v-model="form.puntajeMaximo" etiqueta="Puntaje maximo" :min="10" :max="200" unidad=" pts" />
      <CampoInterruptor v-model="califica" :texto="califica ? 'Genera calificacion' : 'Sin calificacion'" />

      <div :class="estilos.acciones">
        <Boton variante="primario" icono="save" @click="guardar">Guardar configuracion</Boton>
        <Boton variante="secundario" @click="volver">Cancelar</Boton>
      </div>
    </div>

    <div :class="estilos.panel">
      <div :class="estilos.panelCabecera">
        <Icono nombre="eye" :tamano="17" />
        <h3 :class="estilos.panelTitulo">Vista previa</h3>
        <span :class="estilos.pistaDerecha">asi lo vera el estudiante</span>
      </div>
      <div :class="estilos.previa">
        <div :class="estilos.previaCabecera">
          <span :class="estilos.previaChip">{{ juegoSeleccionado?.nombre }}</span>
          <span :class="estilos.previaTiempo">{{ tiempoEtiqueta }}</span>
        </div>
        <p :class="estilos.previaTexto">{{ form.instrucciones || juegoSeleccionado?.descripcion }}</p>
      </div>
    </div>
  </div>
</template>
