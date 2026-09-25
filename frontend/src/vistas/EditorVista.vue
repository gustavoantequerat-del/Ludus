<script setup lang="ts">
/**
 * Editor: la puerta de entrada al contenido de los juegos.
 *
 * Cada juego tiene su propio editor, porque cada uno edita cosas distintas
 * (la Mesa de Cumplimiento edita expedientes y personajes; un memorama
 * editaria pares). Aqui solo se elige cual.
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './EditorVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import { juegosServicio } from '@/servicios/juegos.servicio';
import type { Juego } from '@/tipos';

const enrutador = useRouter();

const juegos = ref<Juego[]>([]);
const cargando = ref(true);

const ordenados = computed(() =>
  // Primero los que se pueden editar: es a lo que vino el docente.
  [...juegos.value].sort((a, b) => Number(b.jugable) - Number(a.jugable)),
);

function abrir(juego: Juego) {
  enrutador.push({ name: 'editor-juego', params: { clave: juego.clave } });
}

onMounted(async () => {
  juegos.value = await juegosServicio.listarCatalogo();
  cargando.value = false;
});
</script>

<template>
  <Encabezado
    titulo="Editor"
    subtitulo="Elige un juego para editar su contenido: lo que van a ver y responder tus estudiantes."
  />

  <div v-if="!cargando" :class="estilos.grilla">
    <article
      v-for="juego in ordenados"
      :key="juego.id"
      :class="[estilos.juego, juego.jugable ? '' : estilos.juegoMaqueta]"
    >
      <div :class="estilos.cabecera">
        <span :class="[estilos.icono, juego.jugable ? '' : estilos.iconoMaqueta]">
          <Icono :nombre="juego.icono" :tamano="19" />
        </span>
        <div :class="estilos.textos">
          <span :class="estilos.nombre">{{ juego.nombre }}</span>
          <span :class="estilos.categoria">{{ juego.categoria }}</span>
        </div>
      </div>

      <p :class="estilos.descripcion">{{ juego.eslogan }}</p>

      <div :class="estilos.pie">
        <Insignia :tono="juego.jugable ? 'ok' : 'neutro'">
          {{ juego.jugable ? 'Editable' : 'Maqueta' }}
        </Insignia>
        <Boton
          v-if="juego.jugable"
          variante="primario"
          icono="pencil"
          @click="abrir(juego)"
        >
          Editar contenido
        </Boton>
        <span v-else :class="estilos.nota">Todavia no tiene contenido que editar</span>
      </div>
    </article>
  </div>
</template>
