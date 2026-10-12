<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import estilos from './JuegosVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Icono from '@/componentes/base/Icono.vue';
import CabeceraSector from '@/componentes/base/CabeceraSector.vue';
import { juegosServicio } from '@/servicios/juegos.servicio';
import { porSector } from '@/utilidades/catalogo';
import type { Juego } from '@/tipos';

const PALETA = [
  ['var(--primario)', 'var(--secundario)'],
  ['var(--terciario)', 'var(--primario)'],
  ['var(--secundario)', 'var(--terciario)'],
  ['var(--primario)', 'var(--rosa)'],
  ['var(--secundario)', 'var(--exito)'],
  ['var(--terciario)', 'var(--secundario)'],
];

const juegos = ref<Juego[]>([]);
const sectores = computed(() => porSector(juegos.value));

function degradado(indice: number) {
  const [desde, hasta] = PALETA[indice % PALETA.length];
  return { background: `linear-gradient(135deg, ${desde}, ${hasta})` };
}

onMounted(async () => {
  juegos.value = await juegosServicio.listarCatalogo();
});
</script>

<template>
  <Encabezado titulo="Biblioteca de juegos" subtitulo="Plantillas reutilizables listas para configurarse dentro de un modulo." />

  <div :class="estilos.aviso">
    <Icono nombre="info" :tamano="17" />
    <p>
      Las plantillas las programa el equipo de desarrollo. Se configuran sus parametros desde el
      modulo de un curso ("Elegir juego" o "Configurar").
    </p>
  </div>

  <template v-for="sector in sectores" :key="sector.tipo">
    <CabeceraSector
      :titulo="sector.titulo"
      :descripcion="sector.descripcion"
      :icono="sector.icono"
      :ludico="sector.tipo === 'ludico'"
    />
    <div :class="estilos.cuadricula">
      <div v-for="(juego, indice) in sector.juegos" :key="juego.id" :class="estilos.tarjeta">
        <div :class="estilos.cabecera" :style="degradado(indice)">
          <Icono :nombre="juego.icono" :tamano="44" />
        </div>
        <div :class="estilos.cuerpo">
          <div :class="estilos.filaTitulo">
            <h3 :class="estilos.nombre">{{ juego.nombre }}</h3>
            <span :class="estilos.categoria">{{ juego.categoria }}</span>
          </div>
          <p :class="estilos.eslogan">{{ juego.eslogan }}</p>
          <div :class="estilos.parametros">
            <span v-for="p in juego.parametros" :key="p" :class="estilos.parametro">{{ p }}</span>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>
