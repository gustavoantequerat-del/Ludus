<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarTema } from '@/composables/usarTema';
import EsqueletoApp from '@/componentes/diseno/EsqueletoApp.vue';

const ruta = useRoute();
const almacen = useAlmacenAutenticacion();
const { inicializarTema } = usarTema();

const requiereSesion = computed(() => !ruta.meta.publica);

/**
 * Al cerrar sesion el usuario queda en null antes de que el enrutador alcance
 * a redirigir; sin esta guarda la vista protegida se volveria a renderizar sin
 * sesion y reventaria al leer el rol.
 */
const mostrarVistaProtegida = computed(() => requiereSesion.value && almacen.estaAutenticado);

onMounted(inicializarTema);
</script>

<template>
  <EsqueletoApp v-if="mostrarVistaProtegida">
    <router-view />
  </EsqueletoApp>
  <router-view v-else-if="!requiereSesion" />
</template>
