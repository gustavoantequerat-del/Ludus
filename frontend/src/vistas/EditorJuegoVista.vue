<script setup lang="ts">
/**
 * Editor de un juego concreto.
 *
 * Cada juego jugable trae sus propias pestanas: son su contenido, no un
 * modulo generico del sistema. Hoy solo la Mesa de Cumplimiento tiene
 * editor; los demas siguen siendo maqueta y lo dicen.
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './EditorJuegoVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Icono from '@/componentes/base/Icono.vue';
import EditorCasos from '@/componentes/editor/EditorCasos.vue';
import EditorPersonajes from '@/componentes/editor/EditorPersonajes.vue';
import { juegosServicio } from '@/servicios/juegos.servicio';
import type { Juego } from '@/tipos';

const props = defineProps<{ clave: string }>();
const enrutador = useRouter();

/** Pestanas de cada juego jugable, por clave del catalogo. */
const PESTANAS_POR_JUEGO: Record<string, { id: string; etiqueta: string; icono: string }[]> = {
  'mesa-cumplimiento': [
    { id: 'casos', etiqueta: 'Casos', icono: 'file-text' },
    { id: 'personajes', etiqueta: 'Personajes', icono: 'user-round' },
  ],
};

const juego = ref<Juego | null>(null);
const cargando = ref(true);
const pestanaActiva = ref('casos');

const pestanas = computed(() => PESTANAS_POR_JUEGO[props.clave] ?? []);

onMounted(async () => {
  const catalogo = await juegosServicio.listarCatalogo();
  juego.value = catalogo.find((j) => j.clave === props.clave) ?? null;
  pestanaActiva.value = pestanas.value[0]?.id ?? '';
  cargando.value = false;
});
</script>

<template>
  <Encabezado
    :titulo="juego?.nombre ?? 'Editor'"
    :subtitulo="juego?.eslogan"
    miga-de-returno="Volver al editor"
    @volver="enrutador.push({ name: 'editor' })"
  />

  <template v-if="!cargando">
    <div v-if="pestanas.length > 0" :class="estilos.pestanas">
      <button
        v-for="pestana in pestanas"
        :key="pestana.id"
        type="button"
        :class="[estilos.pestana, pestanaActiva === pestana.id ? estilos.pestanaActiva : '']"
        @click="pestanaActiva = pestana.id"
      >
        <Icono :nombre="pestana.icono" :tamano="15" />{{ pestana.etiqueta }}
      </button>
    </div>

    <p v-else :class="estilos.aviso">
      Este juego todavia es una maqueta: no tiene contenido que editar.
    </p>

    <EditorCasos v-if="pestanaActiva === 'casos'" />
    <EditorPersonajes v-else-if="pestanaActiva === 'personajes'" />
  </template>
</template>
