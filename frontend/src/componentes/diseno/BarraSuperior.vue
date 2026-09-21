<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './BarraSuperior.module.css';
import Icono from '@/componentes/base/Icono.vue';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { usarTema } from '@/composables/usarTema';
import { etiquetaRol, iniciales } from '@/utilidades/texto';

defineEmits<{ alternarPanel: [] }>();

const almacen = useAlmacenAutenticacion();
const enrutador = useRouter();
const { tema, alternarTema } = usarTema();

const alcance = computed(() =>
  almacen.usuario?.rol === 'superadmin' ? 'Todas las instituciones' : 'Mi institucion',
);

const menuAbierto = ref(false);
const contenedorMenu = ref<HTMLElement | null>(null);

function irAAjustes() {
  menuAbierto.value = false;
  enrutador.push({ name: 'ajustes' });
}

function cerrarSesion() {
  menuAbierto.value = false;
  almacen.cerrarSesion();
  enrutador.push({ name: 'ingresar' });
}

function alClicFuera(evento: MouseEvent) {
  if (!contenedorMenu.value?.contains(evento.target as Node)) {
    menuAbierto.value = false;
  }
}

onMounted(() => document.addEventListener('click', alClicFuera));
onBeforeUnmount(() => document.removeEventListener('click', alClicFuera));
</script>

<template>
  <header :class="estilos.cabecera">
    <button :class="estilos.botonPanel" @click="$emit('alternarPanel')">
      <Icono nombre="panel-left" :tamano="17" />
    </button>
    <div :class="estilos.marca">
      <div :class="estilos.logo"><Icono nombre="gamepad-2" :tamano="19" /></div>
      <div :class="estilos.marcaTextos">
        <span :class="estilos.nombreApp">Ludus</span>
        <span :class="estilos.alcance">{{ alcance }}</span>
      </div>
    </div>
    <div :class="estilos.acciones">
      <button :class="estilos.botonTema" @click="alternarTema">
        <Icono :nombre="tema === 'claro' ? 'moon' : 'sun'" :tamano="16" />
        {{ tema === 'claro' ? 'Oscuro' : 'Claro' }}
      </button>
      <div ref="contenedorMenu" :class="estilos.menuUsuario">
        <button :class="estilos.perfil" @click="menuAbierto = !menuAbierto">
          <span :class="estilos.avatar">{{ iniciales(almacen.usuario?.nombre ?? '') }}</span>
          <span :class="estilos.perfilTextos">
            <span :class="estilos.perfilNombre">{{ almacen.usuario?.nombre }}</span>
            <span :class="estilos.perfilRol">{{ etiquetaRol(almacen.usuario?.rol ?? '') }}</span>
          </span>
          <Icono :nombre="menuAbierto ? 'chevron-up' : 'chevron-down'" :tamano="14" />
        </button>

        <div v-if="menuAbierto" :class="estilos.desplegable">
          <button :class="estilos.opcion" @click="irAAjustes">
            <Icono nombre="user-round" :tamano="15" />Mi perfil
          </button>
          <div :class="estilos.separador" />
          <button :class="[estilos.opcion, estilos.opcionPeligro]" @click="cerrarSesion">
            <Icono nombre="log-out" :tamano="15" />Cerrar sesion
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
