<script setup lang="ts">
import estilos from './TarjetaEntidad.module.css';
import Icono from './Icono.vue';

export interface AccionTarjeta {
  icono: string;
  titulo: string;
  peligro?: boolean;
  accion: () => void;
}

withDefaults(
  defineProps<{
    icono: string;
    colorInicio: string;
    colorFin: string;
    titulo: string;
    descripcion: string;
    etiqueta?: string | null;
    metas?: { icono: string; texto: string }[];
    progreso?: { etiqueta: string; pct: number } | null;
    botonTexto: string;
    botonIcono: string;
    botonTono?: 'primario' | 'secundario' | 'apagado';
    acciones?: AccionTarjeta[];
  }>(),
  { metas: () => [], acciones: () => [], botonTono: 'primario' },
);
const emit = defineEmits<{ abrir: [] }>();
</script>

<template>
  <div :class="estilos.tarjeta">
    <div :class="estilos.cabecera" :style="{ background: `linear-gradient(135deg, ${colorInicio}, ${colorFin})` }">
      <Icono :nombre="icono" :tamano="30" />
      <span v-if="etiqueta" :class="estilos.etiqueta">{{ etiqueta }}</span>
    </div>
    <div :class="estilos.cuerpo">
      <div :class="estilos.textos">
        <h3 :class="estilos.titulo">{{ titulo }}</h3>
        <p :class="estilos.descripcion">{{ descripcion }}</p>
      </div>
      <div v-if="metas.length" :class="estilos.metas">
        <span v-for="m in metas" :key="m.texto" :class="estilos.meta">
          <Icono :nombre="m.icono" :tamano="12" />{{ m.texto }}
        </span>
      </div>
      <div v-if="progreso" :class="estilos.progresoFila">
        <div :class="estilos.progresoCabecera">
          <span :class="estilos.progresoEtiqueta">{{ progreso.etiqueta }}</span>
          <span :class="estilos.progresoPct">{{ progreso.pct }}%</span>
        </div>
        <div :class="estilos.barra">
          <div :class="estilos.barraRelleno" :style="{ width: progreso.pct + '%' }" />
        </div>
      </div>
      <div :class="estilos.pie">
        <button
          :class="[
            estilos.botonPrincipal,
            botonTono === 'secundario' ? estilos.botonSecundarioTono : '',
            botonTono === 'apagado' ? estilos.botonApagado : '',
          ]"
          @click="emit('abrir')"
        >
          <Icono :nombre="botonIcono" :tamano="14" />{{ botonTexto }}
        </button>
        <button
          v-for="a in acciones"
          :key="a.titulo"
          :class="[estilos.accion, a.peligro ? estilos.accionPeligro : '']"
          :title="a.titulo"
          @click="a.accion()"
        >
          <Icono :nombre="a.icono" :tamano="15" />
        </button>
      </div>
    </div>
  </div>
</template>
