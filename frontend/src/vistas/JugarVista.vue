<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './JugarVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import { cursosServicio } from '@/servicios/cursos.servicio';
import { juegosServicio } from '@/servicios/juegos.servicio';
import { resultadosServicio } from '@/servicios/resultados.servicio';
import MesaCumplimiento from '@/componentes/juegos/MesaCumplimiento.vue';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import type { CalificacionPartida, ConfiguracionJuego, Curso, ModuloCurso } from '@/tipos';

const props = defineProps<{ cursoId: string; moduloId: string }>();
const enrutador = useRouter();
const { notificar } = usarNotificaciones();

/** Los juegos con mecanica programada se renderizan por su clave. */
const esJugable = computed(() => configuracion.value?.juego.jugable === true);
const partidaTerminada = ref(false);

function alTerminarPartida(datos: CalificacionPartida) {
  partidaTerminada.value = true;
  notificar(
    datos.nota ? `Calificacion registrada: ${datos.nota}` : `Puntaje registrado: ${datos.puntaje}`,
  );
}

const curso = ref<Curso | null>(null);
const modulo = ref<ModuloCurso | null>(null);
const configuracion = ref<ConfiguracionJuego | null>(null);
const resultado = ref<{ puntaje: number; nota: string | null } | null>(null);

const celdas = ref(
  Array.from({ length: 40 }, () => ({
    fondo: 'var(--celda)',
    color: 'var(--tenue)',
    etiqueta: '',
  })),
);

const tiempoEtiqueta = computed(() => {
  const total = configuracion.value?.tiempoLimiteSegundos ?? 180;
  const m = Math.floor(total / 60);
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
});

function generarTablero() {
  const destacadas = [10, 11, 12, 20, 5, 27];
  celdas.value = celdas.value.map((c, indice) => {
    if (destacadas.includes(indice)) {
      return { fondo: 'var(--primario)', color: 'var(--sobre-brillante)', etiqueta: '' };
    }
    if ([5, 27].includes(indice)) {
      return { fondo: 'var(--secundario-suave-2)', color: 'var(--secundario)', etiqueta: '7' };
    }
    return c;
  });
}

async function cargar() {
  curso.value = await cursosServicio.obtener(props.cursoId);
  modulo.value = curso.value.modulos.find((m) => m.id === props.moduloId) ?? null;
  configuracion.value = await juegosServicio.obtenerConfiguracion(props.moduloId);
  generarTablero();
}

async function terminar() {
  const puntaje = Math.floor(60 + Math.random() * 40);
  const creado = await resultadosServicio.crear(props.moduloId, puntaje);
  resultado.value = { puntaje: creado.puntaje, nota: creado.nota };
}

function reintentar() {
  resultado.value = null;
  generarTablero();
}

function siguienteModulo() {
  enrutador.push({ name: 'curso-detalle', params: { id: props.cursoId } });
}

onMounted(cargar);
</script>

<template>
  <Encabezado
    :titulo="modulo?.titulo ?? ''"
    :subtitulo="modulo?.califica ? 'Este modulo genera calificacion' : 'Practica sin calificacion'"
    miga-de-returno="Volver al curso"
    @volver="enrutador.push({ name: 'curso-detalle', params: { id: props.cursoId } })"
  />

  <!-- Juego con mecanica real -->
  <template v-if="esJugable">
    <MesaCumplimiento :modulo-id="props.moduloId" @terminada="alTerminarPartida" />
    <div v-if="partidaTerminada" style="display: flex; gap: 9px; flex-wrap: wrap">
      <Boton
        variante="primario"
        icono="arrow-right"
        @click="enrutador.push({ name: 'curso-detalle', params: { id: props.cursoId } })"
      >
        Volver al curso
      </Boton>
      <Boton variante="secundario" icono="rotate-ccw" @click="enrutador.go(0)">Jugar de nuevo</Boton>
    </div>
  </template>

  <!-- Plantillas que todavia son maqueta visual -->
  <div v-else :class="estilos.cuadricula">
    <div :class="estilos.panelJuego">
      <div :class="estilos.chips">
        <span :class="estilos.chip">
          <Icono :nombre="configuracion?.juego.icono ?? 'gamepad-2'" :tamano="14" />
          {{ configuracion?.juego.nombre ?? 'Juego' }}
        </span>
        <span :class="estilos.chip"><Icono nombre="timer" :tamano="14" />{{ tiempoEtiqueta }}</span>
        <span :class="estilos.chip">
          <Icono nombre="repeat" :tamano="14" />Intento 1 de {{ configuracion?.intentosPermitidos ?? 3 }}
        </span>
      </div>
      <div :class="estilos.tablero">
        <div
          v-for="(c, indice) in celdas"
          :key="indice"
          :class="estilos.celda"
          :style="{ background: c.fondo, color: c.color }"
        >
          {{ c.etiqueta }}
        </div>
      </div>
      <div :class="estilos.pie">
        <div :class="estilos.metrica">
          <span :class="estilos.metricaEtiqueta">Puntaje</span>
          <span :class="estilos.metricaValor">{{ resultado?.puntaje ?? 0 }}</span>
        </div>
        <div :class="estilos.metrica">
          <span :class="estilos.metricaEtiqueta">Objetivo</span>
          <span style="font: 600 13px var(--fuente-texto); color: var(--suave)">
            Llegar a {{ configuracion?.puntajeMaximo ?? 100 }} puntos
          </span>
        </div>
        <div :class="estilos.pieAcciones">
          <Boton v-if="!resultado" variante="primario" icono="flag" @click="terminar">Terminar</Boton>
          <Boton variante="secundario" @click="enrutador.push({ name: 'curso-detalle', params: { id: props.cursoId } })">Salir</Boton>
        </div>
      </div>
    </div>

    <div v-if="resultado" :class="estilos.panelResultado">
      <div :class="estilos.resultadoCabecera">
        <span :class="estilos.resultadoIcono"><Icono nombre="party-popper" :tamano="18" /></span>
        <h3 :class="estilos.resultadoTitulo">Modulo completado</h3>
      </div>
      <div :class="estilos.puntajeFila">
        <span :class="estilos.puntajeGrande">{{ resultado.puntaje }}</span>
        <span :class="estilos.puntajeMax">puntos de {{ configuracion?.puntajeMaximo ?? 100 }}</span>
      </div>
      <div :class="estilos.barra">
        <div :class="estilos.barraRelleno" :style="{ width: resultado.puntaje + '%' }" />
      </div>
      <div :class="estilos.calificacion">
        <Icono :nombre="resultado.nota ? 'award' : 'circle-slash'" :tamano="17" />
        <div :class="estilos.calificacionTextos">
          <span :class="estilos.calificacionTitulo">
            {{ resultado.nota ? 'Calificacion: ' + resultado.nota : 'Sin calificacion' }}
          </span>
          <span :class="estilos.calificacionSub">
            {{ resultado.nota ? 'Registrada en el modulo ' + modulo?.titulo : 'Este modulo esta configurado como practica.' }}
          </span>
        </div>
      </div>
      <div :class="estilos.resultadoAcciones">
        <Boton variante="primario" icono="arrow-right" @click="siguienteModulo">Siguiente modulo</Boton>
        <Boton variante="secundario" icono="rotate-ccw" @click="reintentar">Reintentar</Boton>
      </div>
    </div>
  </div>
</template>
