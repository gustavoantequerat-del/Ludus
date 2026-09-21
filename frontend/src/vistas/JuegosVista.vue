<script setup lang="ts">
import { onMounted, ref } from 'vue';
import estilos from './JuegosVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Icono from '@/componentes/base/Icono.vue';
import { juegosServicio } from '@/servicios/juegos.servicio';
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

  <div :class="estilos.cuadricula">
    <div v-for="(juego, indice) in juegos" :key="juego.id" :class="estilos.tarjeta">
      <div :class="estilos.cabecera" :style="{ background: `linear-gradient(135deg, ${PALETA[indice % PALETA.length][0]}, ${PALETA[indice % PALETA.length][1]})` }">
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
