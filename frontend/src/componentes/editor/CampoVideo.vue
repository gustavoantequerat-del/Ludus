<script setup lang="ts">
/**
 * Un video del Runner Narrativo: vista previa, subir, cambiar o quitar.
 *
 * Antes de subir revisa en el navegador el peso y la duracion, para avisar al
 * instante. El servidor vuelve a revisar todo (y ademas el codec): esto es
 * solo para no hacer esperar una subida que igual se iba a rechazar.
 */
import { ref } from 'vue';
import estilos from './CampoVideo.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import { historiasServicio } from '@/servicios/historias.servicio';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { urlArchivo } from '@/utilidades/archivos';
import { mensajeDeError } from '@/utilidades/errores';
import type { LimitesVideo } from '@/tipos';

const props = defineProps<{
  modelValue: string | null;
  etiqueta: string;
  ayuda?: string;
  limites: LimitesVideo;
  tono?: 'bueno' | 'malo' | 'neutro';
}>();
const emit = defineEmits<{ 'update:modelValue': [ruta: string | null]; subiendo: [activo: boolean] }>();
const { notificar } = usarNotificaciones();

const avance = ref<number | null>(null);

/** Duracion leida por el navegador; null si no la pudo leer (lo decide el servidor). */
function duracionDe(archivo: File): Promise<number | null> {
  return new Promise((resolver) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(archivo);
    const terminar = (valor: number | null) => {
      URL.revokeObjectURL(url);
      resolver(valor);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => terminar(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => terminar(null);
    setTimeout(() => terminar(null), 5000);
    video.src = url;
  });
}

async function elegir(evento: Event) {
  const entrada = evento.target as HTMLInputElement;
  const archivo = entrada.files?.[0];
  entrada.value = '';
  if (!archivo) return;

  if (!/\.mp4$/i.test(archivo.name) && archivo.type !== 'video/mp4') {
    notificar(`${archivo.name}: tiene que ser un video MP4.`);
    return;
  }
  if (archivo.size > props.limites.maximoMegas * 1024 * 1024) {
    notificar(`${archivo.name} pesa ${(archivo.size / 1048576).toFixed(1)} MB; el maximo es ${props.limites.maximoMegas} MB.`);
    return;
  }
  const duracion = await duracionDe(archivo);
  if (duracion !== null && duracion > props.limites.maximoSegundos + 0.25) {
    notificar(`${archivo.name} dura ${duracion.toFixed(1)} s; el maximo es ${props.limites.maximoSegundos} s.`);
    return;
  }

  avance.value = 0;
  emit('subiendo', true);
  try {
    const ruta = await historiasServicio.subirVideo(archivo, (porcentaje) => (avance.value = porcentaje));
    emit('update:modelValue', ruta);
  } catch (error) {
    notificar(mensajeDeError(error, `No se pudo subir ${archivo.name}`));
  } finally {
    avance.value = null;
    emit('subiendo', false);
  }
}
</script>

<template>
  <div :class="[estilos.campo, tono === 'bueno' ? estilos.bueno : tono === 'malo' ? estilos.malo : '']">
    <span :class="estilos.etiqueta">{{ etiqueta }}</span>
    <span v-if="ayuda" :class="estilos.ayuda">{{ ayuda }}</span>

    <video
      v-if="modelValue && avance === null"
      :key="modelValue"
      :class="estilos.previa"
      :src="urlArchivo(modelValue)"
      controls
      preload="metadata"
    />
    <div v-else :class="estilos.vacio">
      <template v-if="avance !== null">
        <span>Subiendo {{ avance }}%</span>
        <div :class="estilos.barra"><div :class="estilos.barraRelleno" :style="{ width: avance + '%' }" /></div>
      </template>
      <template v-else>
        <Icono nombre="video" :tamano="20" />
        <span>Sin video</span>
      </template>
    </div>

    <div :class="estilos.acciones">
      <label :class="[estilos.botonArchivo, avance !== null ? estilos.botonArchivoInactivo : '']">
        <Icono nombre="upload" :tamano="14" /> {{ modelValue ? 'Cambiar' : 'Subir video' }}
        <input
          :class="estilos.archivoOculto"
          type="file"
          accept="video/mp4,.mp4"
          :disabled="avance !== null"
          @change="elegir"
        />
      </label>
      <Boton v-if="modelValue && avance === null" variante="fantasma" icono="x" @click="emit('update:modelValue', null)">
        Quitar
      </Boton>
    </div>
  </div>
</template>
