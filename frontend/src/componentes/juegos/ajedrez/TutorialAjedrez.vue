<script setup lang="ts">
/**
 * Mini tutorial antes (o durante) la partida: paso a paso, con un tablerito
 * animado por paso. Los pasos y los dibujos salen de utilidades/ajedrez/tutorial.ts
 * (los mismos que usa el paquete SCORM).
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import estilos from './TutorialAjedrez.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import { PASOS_TUTORIAL, svgTutorial } from '@/utilidades/ajedrez/tutorial';

defineProps<{ /** Texto del boton del ultimo paso. */ cierre?: string }>();
const emit = defineEmits<{ cerrar: [] }>();

const indice = ref(0);
const paso = computed(() => PASOS_TUTORIAL[indice.value]);
const ultimo = computed(() => indice.value === PASOS_TUTORIAL.length - 1);
/** Markup generado por svgTutorial con datos fijos del tutorial: seguro para v-html. */
const dibujo = computed(() => svgTutorial(paso.value, estilos as unknown as Parameters<typeof svgTutorial>[1]));

function ir(nuevo: number) {
  indice.value = Math.min(PASOS_TUTORIAL.length - 1, Math.max(0, nuevo));
}

function teclas(evento: KeyboardEvent) {
  if (evento.key === 'ArrowRight') ir(indice.value + 1);
  else if (evento.key === 'ArrowLeft') ir(indice.value - 1);
  else if (evento.key === 'Escape') emit('cerrar');
}

onMounted(() => window.addEventListener('keydown', teclas));
onBeforeUnmount(() => window.removeEventListener('keydown', teclas));
</script>

<template>
  <div :class="estilos.fondo" @click.self="emit('cerrar')">
    <section :class="estilos.caja" role="dialog" aria-modal="true" aria-labelledby="titulo-tutorial">
      <header :class="estilos.cabecera">
        <span :class="estilos.icono"><Icono nombre="graduation-cap" :tamano="18" /></span>
        <div :class="estilos.textosCabecera">
          <span :class="estilos.contador">Como se juega · {{ indice + 1 }} de {{ PASOS_TUTORIAL.length }}</span>
          <h2 id="titulo-tutorial" :class="estilos.titulo">{{ paso.titulo }}</h2>
        </div>
        <button type="button" :class="estilos.cerrar" aria-label="Cerrar tutorial" @click="emit('cerrar')">
          <Icono nombre="x" :tamano="16" />
        </button>
      </header>

      <div :key="indice" :class="estilos.cuerpo">
        <div :class="estilos.ilustracion" v-html="dibujo" />
        <div :class="estilos.explicacion">
          <p v-for="(parrafo, i) in paso.texto" :key="i" :class="estilos.parrafo">{{ parrafo }}</p>
          <ul v-if="paso.destinos || paso.capturas || paso.prohibidas" :class="estilos.leyenda">
            <li v-if="paso.destinos"><span :class="estilos.muestraDestino" />puede ir</li>
            <li v-if="paso.capturas"><span :class="estilos.muestraCaptura" />puede capturar</li>
            <li v-if="paso.prohibidas"><span :class="estilos.muestraProhibida">×</span>no puede ir</li>
          </ul>
        </div>
      </div>

      <footer :class="estilos.pie">
        <div :class="estilos.puntos">
          <button
            v-for="(p, i) in PASOS_TUTORIAL"
            :key="p.titulo"
            type="button"
            :class="[estilos.punto, i === indice ? estilos.puntoActivo : '']"
            :aria-label="`Paso ${i + 1}: ${p.titulo}`"
            @click="ir(i)"
          />
        </div>
        <div :class="estilos.acciones">
          <Boton v-if="indice > 0" icono="arrow-left" @click="ir(indice - 1)">Anterior</Boton>
          <Boton v-if="!ultimo" variante="primario" icono="arrow-right" @click="ir(indice + 1)">Siguiente</Boton>
          <Boton v-else variante="primario" icono="check" @click="emit('cerrar')">{{ cierre ?? 'Listo' }}</Boton>
        </div>
      </footer>
    </section>
  </div>
</template>
