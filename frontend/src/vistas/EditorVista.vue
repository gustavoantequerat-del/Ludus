<script setup lang="ts">
/**
 * Editor: la puerta de entrada al contenido de los juegos.
 *
 * Cada juego tiene su propio editor, porque cada uno edita cosas distintas
 * (la Mesa de Cumplimiento edita expedientes y personajes; el Memorama, sus
 * mazos; el Runner, sus historias en video). Aqui solo se elige cual.
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './EditorVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import CabeceraSector from '@/componentes/base/CabeceraSector.vue';
import { juegosServicio } from '@/servicios/juegos.servicio';
import { porSector } from '@/utilidades/catalogo';
import type { Juego } from '@/tipos';

const enrutador = useRouter();

const juegos = ref<Juego[]>([]);
const cargando = ref(true);

// En cada sector, primero los que se pueden editar: es a lo que vino el docente.
const sectores = computed(() =>
  porSector(juegos.value).map((sector) => ({
    ...sector,
    juegos: [...sector.juegos].sort((a, b) => Number(b.jugable) - Number(a.jugable)),
  })),
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

  <template v-for="sector in cargando ? [] : sectores" :key="sector.tipo">
    <CabeceraSector
      :titulo="sector.titulo"
      :descripcion="sector.descripcion"
      :icono="sector.icono"
      :ludico="sector.tipo === 'ludico'"
    />
    <div :class="estilos.grilla">
      <article
        v-for="juego in sector.juegos"
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
</template>
