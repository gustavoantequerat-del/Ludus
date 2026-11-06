<script setup lang="ts">
/**
 * Ranking de un curso al momento de consultar: podio de los tres primeros y
 * la tabla de quienes ya terminaron. El docente ve ademas quienes van en
 * progreso; el estudiante ve con nombre solo el podio y su propia fila.
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './RankingVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import Podio from '@/componentes/ranking/Podio.vue';
import { cursosServicio } from '@/servicios/cursos.servicio';
import { mensajeDeError } from '@/utilidades/errores';
import type { RankingCurso } from '@/tipos';

const props = defineProps<{ id: string }>();
const enrutador = useRouter();

const datos = ref<RankingCurso | null>(null);
const error = ref('');
const cargando = ref(false);

const faltan = computed(() =>
  datos.value?.miProgreso ? datos.value.totalModulos - datos.value.miProgreso.completados : 0,
);
const hora = computed(() =>
  datos.value ? new Date(datos.value.calculadoEn).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '',
);

function fecha(iso: string) {
  return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    datos.value = await cursosServicio.ranking(props.id);
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo cargar el ranking');
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <Encabezado
    :titulo="datos ? `Ranking · ${datos.curso.nombre}` : 'Ranking'"
    subtitulo="Promedio de la mejor nota de cada modulo que califica. Si dos empatan, va primero quien termino antes."
    miga-de-returno="Volver al curso"
    @volver="enrutador.push({ name: 'curso-detalle', params: { id: props.id } })"
  >
    <Boton icono="refresh-cw" :deshabilitado="cargando" @click="cargar">Actualizar</Boton>
  </Encabezado>

  <p v-if="error" :class="estilos.error">{{ error }}</p>

  <template v-else-if="datos">
    <div :class="estilos.resumen">
      <span :class="estilos.chip"><Icono nombre="flag" :tamano="14" />{{ datos.terminaron }} de {{ datos.totalInscritos }} terminaron</span>
      <span :class="estilos.chip"><Icono nombre="layers" :tamano="14" />{{ datos.totalModulos }} modulos cuentan</span>
      <span :class="estilos.chip"><Icono nombre="clock" :tamano="14" />Posiciones a las {{ hora }}</span>
    </div>

    <!-- Aviso propio del estudiante -->
    <div v-if="datos.vista === 'estudiante'" :class="[estilos.aviso, datos.miPosicion ? estilos.avisoBueno : '']">
      <Icono :nombre="datos.miPosicion ? 'trophy' : 'hourglass'" :tamano="20" />
      <span v-if="datos.miPosicion">
        Vas en el puesto <strong>{{ datos.miPosicion }}</strong> de {{ datos.terminaron }}.
        <template v-if="datos.miPosicion <= 3">Estas en el podio!</template>
        Las posiciones pueden cambiar cuando terminen los demas.
      </span>
      <span v-else-if="datos.totalModulos === 0">Este curso todavia no tiene modulos que califiquen.</span>
      <span v-else>
        Te {{ faltan === 1 ? 'falta 1 modulo' : `faltan ${faltan} modulos` }} para entrar al ranking
        (llevas {{ datos.miProgreso?.completados ?? 0 }} de {{ datos.totalModulos }}).
      </span>
    </div>

    <section :class="estilos.panel">
      <div v-if="datos.ranking.length" :class="estilos.podio">
        <Podio :filas="datos.ranking" />
      </div>
      <div v-else :class="estilos.vacio">
        <Icono nombre="trophy" :tamano="30" />
        <p>Todavia nadie termino el curso. El primero en completar todos los modulos estrena el podio.</p>
      </div>

      <table v-if="datos.ranking.length" :class="estilos.tabla">
        <thead>
          <tr>
            <th>#</th>
            <th>Estudiante</th>
            <th>Nota</th>
            <th :class="estilos.colFecha">Termino</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(fila, i) in datos.ranking"
            :key="fila.posicion"
            :class="fila.esYo ? estilos.filaYo : ''"
            :style="{ '--orden': Math.min(i, 12) }"
          >
            <td>
              <span :class="[estilos.puesto, fila.posicion <= 3 ? estilos[`puesto${fila.posicion}`] : '']">{{ fila.posicion }}</span>
            </td>
            <td>{{ fila.nombre }}<span v-if="fila.esYo" :class="estilos.tu">Tu</span></td>
            <td :class="estilos.nota">{{ fila.nota.toFixed(1) }}</td>
            <td :class="estilos.colFecha">{{ fecha(fila.terminadoEn) }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- Solo el docente: quienes van en progreso -->
    <section v-if="datos.vista === 'docente' && datos.enProgreso?.length" :class="estilos.panel">
      <h2 :class="estilos.panelTitulo"><Icono nombre="hourglass" :tamano="16" />En progreso</h2>
      <table :class="estilos.tabla">
        <thead>
          <tr>
            <th>Estudiante</th>
            <th>Avance</th>
            <th>Nota parcial</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in datos.enProgreso" :key="fila.estudianteId">
            <td>{{ fila.nombre }}</td>
            <td>
              <div :class="estilos.avance">
                <div :class="estilos.barra">
                  <div :class="estilos.relleno" :style="{ width: `${(fila.completados / Math.max(1, datos.totalModulos)) * 100}%` }" />
                </div>
                <span>{{ fila.completados }}/{{ datos.totalModulos }}</span>
              </div>
            </td>
            <td :class="estilos.nota">{{ fila.notaParcial === null ? '-' : fila.notaParcial.toFixed(1) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </template>
</template>
