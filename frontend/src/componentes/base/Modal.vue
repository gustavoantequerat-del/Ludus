<script setup lang="ts">
import estilos from './Modal.module.css';
import Icono from './Icono.vue';
import Boton from './Boton.vue';

withDefaults(
  defineProps<{
    titulo: string;
    descripcion?: string;
    icono?: string;
    peligro?: boolean;
    ancho?: boolean;
    etiquetaConfirmar?: string;
  }>(),
  { icono: 'info', peligro: false, ancho: false, etiquetaConfirmar: 'Guardar' },
);
const emit = defineEmits<{ cerrar: []; confirmar: [] }>();
</script>

<template>
  <div :class="estilos.fondo" @click.self="emit('cerrar')">
    <div :class="[estilos.caja, ancho ? estilos.cajaAncha : '']">
      <div :class="estilos.cabecera">
        <span :class="[estilos.iconoCabecera, peligro ? estilos.iconoCabeceraPeligro : '']">
          <Icono :nombre="icono" :tamano="18" />
        </span>
        <div :class="estilos.textosCabecera">
          <h3 :class="estilos.titulo">{{ titulo }}</h3>
          <p v-if="descripcion" :class="estilos.descripcion">{{ descripcion }}</p>
        </div>
        <button :class="estilos.cerrar" @click="emit('cerrar')">
          <Icono nombre="x" :tamano="15" />
        </button>
      </div>
      <div :class="estilos.cuerpo">
        <slot />
      </div>
      <div :class="estilos.pie">
        <Boton variante="secundario" @click="emit('cerrar')">Cancelar</Boton>
        <Boton
          :variante="peligro ? 'peligro' : 'primario'"
          :icono="peligro ? 'trash-2' : 'check'"
          @click="emit('confirmar')"
        >
          {{ etiquetaConfirmar }}
        </Boton>
      </div>
    </div>
  </div>
</template>
