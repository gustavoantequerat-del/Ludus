<script setup lang="ts">
/**
 * Mesa de Cumplimiento: llegan solicitudes de PSAV/VASP y el estudiante decide
 * si aprueba, aprueba con debida diligencia reforzada o rechaza.
 *
 * El banco de casos y la calificacion viven en el servidor: aqui solo se
 * muestra el expediente y se pide el veredicto de cada caso para dar
 * retroalimentacion inmediata.
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import estilos from './MesaCumplimiento.module.css';
import Icono from '@/componentes/base/Icono.vue';
import Boton from '@/componentes/base/Boton.vue';
import { juegosServicio } from '@/servicios/juegos.servicio';
import { urlArchivo } from '@/utilidades/archivos';
import type {
  CalificacionPartida,
  CasoCumplimiento,
  DecisionCumplimiento,
  PartidaCumplimiento,
  VeredictoCaso,
} from '@/tipos';

const props = defineProps<{ moduloId: string }>();
const emit = defineEmits<{ terminada: [resultado: CalificacionPartida] }>();

const OPCIONES: {
  decision: DecisionCumplimiento;
  etiqueta: string;
  icono: string;
  ayuda: string;
}[] = [
  {
    decision: 'aprobar',
    etiqueta: 'Aprobar',
    icono: 'check',
    ayuda: 'Relacion con controles estandar',
  },
  {
    decision: 'reforzar',
    etiqueta: 'Aprobar con EDD',
    icono: 'shield-alert',
    ayuda: 'Limites, condiciones y monitoreo reforzado',
  },
  {
    decision: 'rechazar',
    etiqueta: 'Rechazar',
    icono: 'x',
    ayuda: 'El riesgo no es mitigable',
  },
];

const partida = ref<PartidaCumplimiento | null>(null);
const indice = ref(0);
const respuestas = ref<{ casoId: string; decision: DecisionCumplimiento }[]>([]);
const veredicto = ref<VeredictoCaso | null>(null);
const aciertos = ref(0);
const enviando = ref(false);
const resultado = ref<CalificacionPartida | null>(null);
const segundosRestantes = ref(0);
let temporizador: ReturnType<typeof setInterval> | null = null;

const casoActual = computed<CasoCumplimiento | null>(
  () => partida.value?.casos[indice.value] ?? null,
);
const total = computed(() => partida.value?.casos.length ?? 0);
const progreso = computed(() => (total.value ? (indice.value / total.value) * 100 : 0));
const estiloEscena = computed(() => ({
  '--fondo-escena': partida.value?.escena?.fondo
    ? `url("${urlArchivo(partida.value.escena.fondo)}")`
    : 'none',
}));

/** El CEO reacciona al veredicto: asiente si acertaste, se molesta si no. */
const claseReaccion = computed(() => {
  if (!veredicto.value) return '';
  return veredicto.value.correcta ? estilos.personajeContento : estilos.personajeMolesto;
});

const tiempoEtiqueta = computed(() => {
  const minutos = Math.floor(segundosRestantes.value / 60);
  const segundos = String(segundosRestantes.value % 60).padStart(2, '0');
  return `${minutos}:${segundos}`;
});

async function cargar() {
  partida.value = await juegosServicio.armarPartida(props.moduloId);
  segundosRestantes.value = partida.value.tiempoLimiteSegundos;
  temporizador = setInterval(() => {
    segundosRestantes.value -= 1;
    if (segundosRestantes.value <= 0) terminar();
  }, 1000);
}

async function decidir(decision: DecisionCumplimiento) {
  if (!casoActual.value || veredicto.value) return;
  respuestas.value.push({ casoId: casoActual.value.id, decision });
  veredicto.value = await juegosServicio.verificarCaso(casoActual.value.id, decision);
  if (veredicto.value.correcta) aciertos.value += 1;
}

function siguiente() {
  veredicto.value = null;
  if (indice.value + 1 >= total.value) {
    terminar();
    return;
  }
  indice.value += 1;
}

async function terminar() {
  if (enviando.value || resultado.value) return;
  detenerTemporizador();
  if (respuestas.value.length === 0) return;

  enviando.value = true;
  try {
    resultado.value = await juegosServicio.terminarPartida(props.moduloId, respuestas.value);
    emit('terminada', resultado.value);
  } finally {
    enviando.value = false;
  }
}

function detenerTemporizador() {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
}

function etiquetaDecision(decision: DecisionCumplimiento) {
  return OPCIONES.find((o) => o.decision === decision)?.etiqueta ?? decision;
}

onMounted(cargar);
onBeforeUnmount(detenerTemporizador);
</script>

<template>
  <div v-if="partida" :class="estilos.mesa">
    <!-- Repaso final -->
    <template v-if="resultado">
      <div :class="estilos.repaso">
        <div :class="estilos.resumen">
          <div :class="estilos.resumenTarjeta">
            <span :class="estilos.resumenValor">{{ resultado.calificacion.puntaje }}</span>
            <span :class="estilos.resumenEtiqueta">Puntaje</span>
          </div>
          <div :class="estilos.resumenTarjeta">
            <span :class="estilos.resumenValor">
              {{ resultado.calificacion.aciertos }}/{{ resultado.calificacion.total }}
            </span>
            <span :class="estilos.resumenEtiqueta">Decisiones correctas</span>
          </div>
          <div :class="estilos.resumenTarjeta">
            <span :class="estilos.resumenValor">{{ resultado.calificacion.erroresPorExceso }}</span>
            <span :class="estilos.resumenEtiqueta">Rechazos sin sustento</span>
          </div>
          <div :class="estilos.resumenTarjeta">
            <span :class="estilos.resumenValor">{{ resultado.calificacion.erroresPorOmision }}</span>
            <span :class="estilos.resumenEtiqueta">Riesgos que dejaste pasar</span>
          </div>
        </div>

        <div :class="estilos.listaRepaso">
          <div v-for="v in resultado.calificacion.detalle" :key="v.casoId" :class="estilos.filaRepaso">
            <span :class="[estilos.marcaRepaso, v.correcta ? estilos.marcaOk : estilos.marcaMal]">
              <Icono :nombre="v.correcta ? 'check' : 'x'" :tamano="15" />
            </span>
            <div :class="estilos.repasoTextos">
              <span :class="estilos.repasoEntidad">{{ v.entidad }}</span>
              <span :class="estilos.repasoDecisiones">
                Decidiste {{ etiquetaDecision(v.decisionTomada) }} · Correcto:
                {{ etiquetaDecision(v.decisionCorrecta) }}
              </span>
              <span :class="estilos.repasoRegla">{{ v.regla }} — {{ v.origen }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Partida en curso -->
    <template v-else>
      <div :class="estilos.barra">
        <div :class="estilos.indicador">
          <span :class="estilos.indicadorEtiqueta">Expediente</span>
          <span :class="estilos.indicadorValor">{{ indice + 1 }} de {{ total }}</span>
        </div>
        <div :class="estilos.indicador">
          <span :class="estilos.indicadorEtiqueta">Aciertos</span>
          <span :class="estilos.indicadorValor">{{ aciertos }}</span>
        </div>
        <div :class="estilos.progreso">
          <div :class="estilos.progresoRelleno" :style="{ width: progreso + '%' }" />
        </div>
        <div :class="estilos.indicador">
          <span :class="estilos.indicadorEtiqueta">Tiempo</span>
          <span
            :class="[estilos.indicadorValor, segundosRestantes <= 30 ? estilos.indicadorValorAlerta : '']"
          >
            {{ tiempoEtiqueta }}
          </span>
        </div>
      </div>

      <!--
        La escena: el CEO entra mirando al jugador y trae su solicitud. El
        fondo llega por variable CSS para que las reglas visuales queden en el
        modulo de estilos y no en el template.
      -->
      <div v-if="casoActual" :class="estilos.escena" :style="estiloEscena">
        <span :class="estilos.escenaVelo" />
        <div
          :key="casoActual.id"
          :class="[estilos.personaje, claseReaccion]"
        >
          <img
            v-if="casoActual.personaje"
            :class="estilos.personajeImagen"
            :src="urlArchivo(casoActual.personaje.imagen)"
            :alt="casoActual.personaje.nombre"
          />
          <span v-else :class="estilos.silueta"><Icono nombre="user-round" :tamano="46" /></span>
          <span v-if="casoActual.personaje" :class="estilos.placa">
            <span :class="estilos.placaNombre">{{ casoActual.personaje.nombre }}</span>
            <span v-if="casoActual.personaje.cargo" :class="estilos.placaCargo">
              {{ casoActual.personaje.cargo }}
            </span>
          </span>
        </div>

        <div :class="estilos.globo">
          <span :class="estilos.globoEntidad">{{ casoActual.entidad }}</span>
          <span :class="estilos.globoTipo">
            {{ casoActual.tipo }} · {{ casoActual.jurisdiccion }}
          </span>
          <span :class="estilos.globoSolicitud">{{ casoActual.solicitud }}</span>
        </div>
      </div>

      <div v-if="casoActual" :class="estilos.expediente">
        <div :class="estilos.campos">
          <div v-for="campo in casoActual.campos" :key="campo.etiqueta" :class="estilos.campo">
            <span :class="estilos.campoEtiqueta">{{ campo.etiqueta }}</span>
            <span :class="estilos.campoValor">{{ campo.valor }}</span>
          </div>
        </div>
      </div>

      <div v-if="!veredicto" :class="estilos.decisiones">
        <button
          v-for="opcion in OPCIONES"
          :key="opcion.decision"
          type="button"
          :class="estilos.botonDecision"
          :disabled="enviando"
          @click="decidir(opcion.decision)"
        >
          <span :class="estilos.botonDecisionTitulo">
            <Icono :nombre="opcion.icono" :tamano="15" />{{ opcion.etiqueta }}
          </span>
          <span :class="estilos.botonDecisionAyuda">{{ opcion.ayuda }}</span>
        </button>
      </div>

      <div
        v-else
        :class="[
          estilos.veredicto,
          veredicto.correcta ? estilos.veredictoCorrecto : estilos.veredictoIncorrecto,
        ]"
      >
        <div :class="estilos.veredictoCabecera">
          <Icono :nombre="veredicto.correcta ? 'check-circle-2' : 'alert-triangle'" :tamano="18" />
          {{ veredicto.correcta ? 'Decision correcta' : 'Revisa este criterio' }}
        </div>
        <span v-if="!veredicto.correcta" :class="estilos.veredictoRegla">
          Correspondia: {{ etiquetaDecision(veredicto.decisionCorrecta) }}
        </span>
        <span :class="estilos.veredictoRegla">{{ veredicto.regla }}</span>
        <p :class="estilos.veredictoExplicacion">{{ veredicto.explicacion }}</p>
        <div :class="estilos.pieVeredicto">
          <span :class="estilos.veredictoOrigen">{{ veredicto.origen }}</span>
          <Boton
            :class="estilos.botonSiguiente"
            variante="primario"
            :icono="indice + 1 >= total ? 'flag' : 'arrow-right'"
            :deshabilitado="enviando"
            @click="siguiente"
          >
            {{ indice + 1 >= total ? 'Terminar' : 'Siguiente expediente' }}
          </Boton>
        </div>
      </div>
    </template>
  </div>
</template>
