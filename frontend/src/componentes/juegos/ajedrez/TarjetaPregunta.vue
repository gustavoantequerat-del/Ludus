<script setup lang="ts">
/** La pregunta de una captura (o del modo examen) y, despues, su resultado. */
import estilos from './TarjetaPregunta.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import type { PreguntaAjedrezEnJuego } from '@/tipos';

defineProps<{
  pregunta: PreguntaAjedrezEnJuego;
  /** Que esta en juego: "Tu alfil ataca su torre en e5". */
  contexto: string;
  /** Aviso destacado (pregunta critica o de rey). */
  aviso?: string | null;
  resultado: { correcta: boolean; mensaje: string } | null;
  enviando: boolean;
}>();
const emit = defineEmits<{ responder: [opcionId: string]; continuar: [] }>();

const LETRAS = ['A', 'B', 'C', 'D'];
</script>

<template>
  <div
    :class="[
      estilos.tarjeta,
      pregunta.modo === 'critica' && !resultado ? estilos.tarjetaCritica : '',
      resultado ? (resultado.correcta ? estilos.tarjetaBien : estilos.tarjetaMal) : '',
    ]"
  >
    <span :class="estilos.contexto"><Icono nombre="swords" :tamano="15" />{{ contexto }}</span>
    <p v-if="aviso" :class="[estilos.aviso, pregunta.modo === 'critica' ? estilos.avisoCritico : '']">
      <Icono nombre="shield-alert" :tamano="16" />{{ aviso }}
    </p>
    <h3 :class="estilos.texto">{{ pregunta.texto }}</h3>

    <div v-if="!resultado" :class="estilos.opciones">
      <button
        v-for="(opcion, i) in pregunta.opciones"
        :key="opcion.id"
        type="button"
        :class="estilos.opcion"
        :disabled="enviando"
        @click="emit('responder', opcion.id)"
      >
        <span :class="estilos.letra">{{ LETRAS[i] }}</span>
        <span>{{ opcion.texto }}</span>
      </button>
    </div>

    <div v-else :class="[estilos.resultado, resultado.correcta ? estilos.bien : estilos.mal]">
      <Icono :nombre="resultado.correcta ? 'circle-check' : 'circle-x'" :tamano="22" />
      <span :class="estilos.resultadoTexto">{{ resultado.mensaje }}</span>
      <Boton variante="primario" icono="arrow-right" @click="emit('continuar')">Continuar</Boton>
    </div>
  </div>
</template>
