<script setup lang="ts">
/**
 * Un video de la historia, alojado en YouTube o en Google Drive.
 *
 * - YouTube: se usa su API, que avisa cuando el video termina, asi que la
 *   historia sigue sola.
 * - Drive no avisa de nada: su reproductor es un iframe cerrado. El estudiante
 *   lo mira y pulsa "Continuar".
 *
 * Si la API de YouTube no carga (bloqueador, sin red) o el video da error,
 * cae al iframe simple con "Continuar": la partida nunca queda trabada.
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import estilos from './ReproductorVideo.module.css';
import Boton from '@/componentes/base/Boton.vue';
import { cargarApiYoutube, urlInsercion, type ReproductorYoutube } from '@/utilidades/videos';
import type { VideoExterno } from '@/tipos';

const props = defineProps<{ video: VideoExterno }>();
const emit = defineEmits<{ terminado: [] }>();

const contenedor = ref<HTMLElement | null>(null);
/** true: iframe simple y boton Continuar (Drive, o YouTube sin su API). */
const conBoton = ref(props.video.fuente === 'drive');
const problema = ref(false);
let reproductor: ReproductorYoutube | null = null;
let avisado = false;

function terminar() {
  if (avisado) return;
  avisado = true;
  emit('terminado');
}

onMounted(async () => {
  if (props.video.fuente !== 'youtube' || !contenedor.value) return;
  try {
    const YT = await cargarApiYoutube();
    if (!contenedor.value) return;
    reproductor = new YT.Player(contenedor.value, {
      videoId: props.video.id,
      host: 'https://www.youtube-nocookie.com',
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3 },
      events: {
        onReady: (evento) => evento.target.playVideo(),
        onStateChange: (evento) => {
          if (evento.data === YT.PlayerState.ENDED) terminar();
        },
        onError: () => {
          problema.value = true;
          conBoton.value = true;
        },
      },
    });
  } catch {
    conBoton.value = true;
  }
});

onBeforeUnmount(() => reproductor?.destroy());
</script>

<template>
  <div :class="estilos.reproductor">
    <iframe
      v-if="conBoton"
      :class="estilos.marco"
      :src="urlInsercion(video)"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowfullscreen
      title="Video de la historia"
    />
    <!-- La API de YouTube reemplaza el div interior por su iframe; el exterior es de Vue. -->
    <div v-else :class="estilos.marco"><div ref="contenedor" /></div>

    <div v-if="conBoton" :class="estilos.pie">
      <span :class="estilos.ayuda">
        {{ problema ? 'El video no se pudo reproducir.' : 'Dale play al video y, cuando termine, continua.' }}
      </span>
      <Boton variante="primario" icono="arrow-right" @click="terminar">Continuar</Boton>
    </div>
  </div>
</template>
