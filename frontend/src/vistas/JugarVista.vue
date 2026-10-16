<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './JugarVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import { cursosServicio } from '@/servicios/cursos.servicio';
import { juegosServicio } from '@/servicios/juegos.servicio';
import MesaCumplimiento from '@/componentes/juegos/MesaCumplimiento.vue';
import Memorama from '@/componentes/juegos/Memorama.vue';
import Mahjong from '@/componentes/juegos/Mahjong.vue';
import RunnerNarrativo from '@/componentes/juegos/RunnerNarrativo.vue';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import type { ConfiguracionJuego, Curso, FinDePartida, ModuloCurso } from '@/tipos';

const props = defineProps<{ cursoId: string; moduloId: string }>();
const enrutador = useRouter();
const { notificar } = usarNotificaciones();

/** Los juegos con mecanica programada se renderizan por su clave. */
const JUEGOS = {
  'mesa-cumplimiento': MesaCumplimiento,
  memorama: Memorama,
  mahjong: Mahjong,
  'runner-narrativo': RunnerNarrativo,
};
const componenteJuego = computed(() => {
  const clave = configuracion.value?.juego.clave ?? '';
  return clave in JUEGOS ? JUEGOS[clave as keyof typeof JUEGOS] : null;
});
const partidaTerminada = ref(false);

function alTerminarPartida(datos: FinDePartida) {
  partidaTerminada.value = true;
  notificar(
    datos.nota ? `Calificacion registrada: ${datos.nota}` : `Puntaje registrado: ${datos.puntaje}`,
  );
}

const curso = ref<Curso | null>(null);
const modulo = ref<ModuloCurso | null>(null);
const configuracion = ref<ConfiguracionJuego | null>(null);
const cargado = ref(false);

async function cargar() {
  curso.value = await cursosServicio.obtener(props.cursoId);
  modulo.value = curso.value.modulos.find((m) => m.id === props.moduloId) ?? null;
  configuracion.value = (await juegosServicio.obtenerConfiguracion(props.moduloId)) || null;
  cargado.value = true;
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
  <template v-if="componenteJuego">
    <component :is="componenteJuego" :modulo-id="props.moduloId" @terminada="alTerminarPartida" />
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

  <!-- Modulo sin juego (o con uno que ya no existe en el catalogo) -->
  <div v-else-if="cargado" :class="estilos.sinJuego">
    <span :class="estilos.sinJuegoIcono"><Icono nombre="gamepad-2" :tamano="20" /></span>
    <h3 :class="estilos.sinJuegoTitulo">Este modulo todavia no tiene juego</h3>
    <p :class="estilos.sinJuegoTexto">Tu docente aun no le asigno uno. Vuelve mas tarde.</p>
    <Boton variante="secundario" icono="arrow-left" @click="enrutador.push({ name: 'curso-detalle', params: { id: props.cursoId } })">
      Volver al curso
    </Boton>
  </div>
</template>
