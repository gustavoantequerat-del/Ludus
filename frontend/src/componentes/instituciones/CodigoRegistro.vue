<script setup lang="ts">
/**
 * Codigo de registro de una institucion: lo ve el admin (o el superadmin),
 * lo copia o comparte como enlace y lo renueva si se filtro. Con el, los
 * estudiantes nuevos crean su cuenta desde la landing.
 */
import { computed, onMounted, ref } from 'vue';
import estilos from './CodigoRegistro.module.css';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import { institucionesServicio, type CodigoRegistro } from '@/servicios/instituciones.servicio';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { mensajeDeError } from '@/utilidades/errores';

const props = defineProps<{ institucionId: string }>();
const { notificar } = usarNotificaciones();

const datos = ref<CodigoRegistro | null>(null);
const error = ref('');
const confirmando = ref(false);
const renovando = ref(false);
/** Sube cada vez que cambia el codigo, para repetir la animacion. */
const vuelta = ref(0);

const enlace = computed(() =>
  datos.value ? `${window.location.origin}/bienvenida?codigo=${datos.value.codigo}` : '',
);

async function copiar(texto: string, aviso: string) {
  try {
    await navigator.clipboard.writeText(texto);
    notificar(aviso);
  } catch {
    notificar('No se pudo copiar: seleccionalo y copialo a mano');
  }
}

async function renovar() {
  renovando.value = true;
  try {
    datos.value = await institucionesServicio.renovarCodigo(props.institucionId);
    vuelta.value++;
    notificar('Codigo nuevo listo: el anterior ya no sirve');
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo renovar el codigo');
  } finally {
    renovando.value = false;
    confirmando.value = false;
  }
}

onMounted(async () => {
  try {
    datos.value = await institucionesServicio.codigoRegistro(props.institucionId);
  } catch (fallo) {
    error.value = mensajeDeError(fallo, 'No se pudo leer el codigo de registro');
  }
});
</script>

<template>
  <div :class="estilos.codigoRegistro">
    <p v-if="error" :class="estilos.error">{{ error }}</p>
    <template v-else-if="datos">
      <p :class="estilos.texto">
        Comparte este codigo con tus estudiantes nuevos: con el crean su cuenta en
        <strong>{{ datos.nombre }}</strong> desde la pagina de inicio.
      </p>
      <div :class="estilos.fila">
        <span :key="vuelta" :class="estilos.codigo" data-codigo-registro>{{ datos.codigo }}</span>
        <Boton icono="copy" @click="copiar(datos.codigo, 'Codigo copiado')">Copiar</Boton>
        <Boton icono="link" @click="copiar(enlace, 'Enlace de registro copiado')">Copiar enlace</Boton>
      </div>
      <div v-if="!confirmando" :class="estilos.renovar">
        <button type="button" :class="estilos.enlaceRenovar" @click="confirmando = true">
          <Icono nombre="refresh-cw" :tamano="13" />Renovar codigo
        </button>
      </div>
      <div v-else :class="estilos.confirmar">
        <span>El codigo actual dejara de servir. Las cuentas ya creadas no cambian.</span>
        <Boton variante="secundario" @click="confirmando = false">Cancelar</Boton>
        <Boton variante="peligro" icono="refresh-cw" :deshabilitado="renovando" @click="renovar">Renovar</Boton>
      </div>
    </template>
  </div>
</template>
