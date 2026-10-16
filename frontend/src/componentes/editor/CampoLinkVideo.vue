<script setup lang="ts">
/**
 * Un video del Runner Narrativo: el link de YouTube o de Google Drive donde
 * el docente lo subio. Ludus no guarda el video, solo el link.
 *
 * Mientras se escribe dice de que servicio es (o que no se reconoce) y deja
 * ver el video ahi mismo, para comprobar que se puede reproducir.
 */
import { computed, ref, watch } from 'vue';
import estilos from './CampoLinkVideo.module.css';
import Icono from '@/componentes/base/Icono.vue';
import { leerLinkVideo, urlInsercion } from '@/utilidades/videos';

const props = defineProps<{
  modelValue: string | null;
  etiqueta: string;
  ayuda?: string;
  tono?: 'bueno' | 'malo' | 'neutro';
}>();
const emit = defineEmits<{ 'update:modelValue': [link: string | null] }>();

const verPrevia = ref(false);
const video = computed(() => leerLinkVideo(props.modelValue));
const invalido = computed(() => !!props.modelValue?.trim() && !video.value);

watch(
  () => props.modelValue,
  () => (verPrevia.value = false),
);

function escribir(evento: Event) {
  const texto = (evento.target as HTMLInputElement).value;
  emit('update:modelValue', texto.trim() ? texto.trim() : null);
}
</script>

<template>
  <div :class="[estilos.campo, tono === 'bueno' ? estilos.bueno : tono === 'malo' ? estilos.malo : '']">
    <span :class="estilos.etiqueta">{{ etiqueta }}</span>
    <span v-if="ayuda" :class="estilos.ayuda">{{ ayuda }}</span>

    <input
      :class="[estilos.entrada, invalido ? estilos.entradaInvalida : '']"
      type="url"
      :value="modelValue ?? ''"
      placeholder="https://youtu.be/... o https://drive.google.com/file/d/..."
      @change="escribir"
      @input="escribir"
    />

    <div :class="estilos.estado">
      <template v-if="video">
        <span :class="estilos.fuente">
          <Icono :nombre="video.fuente === 'youtube' ? 'youtube' : 'hard-drive'" :tamano="14" />
          {{ video.fuente === 'youtube' ? 'YouTube: la historia sigue sola al terminar' : 'Google Drive: el estudiante pulsa "Continuar"' }}
        </span>
        <button type="button" :class="estilos.enlace" @click="verPrevia = !verPrevia">
          {{ verPrevia ? 'Ocultar' : 'Probar video' }}
        </button>
      </template>
      <span v-else-if="invalido" :class="estilos.error">No es un link de YouTube ni de Google Drive</span>
      <span v-else :class="estilos.vacioTexto">Sin video</span>
    </div>

    <iframe
      v-if="video && verPrevia"
      :class="estilos.previa"
      :src="urlInsercion(video)"
      allow="autoplay; encrypted-media; fullscreen"
      allowfullscreen
      title="Vista previa del video"
    />
  </div>
</template>
