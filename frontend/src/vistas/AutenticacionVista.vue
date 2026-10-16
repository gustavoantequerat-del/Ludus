<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './AutenticacionVista.module.css';
import Icono from '@/componentes/base/Icono.vue';
import Boton from '@/componentes/base/Boton.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { opcionesPublicas } from '@/utilidades/opciones';
import { mostrarBotonGoogle } from '@/utilidades/google';
import { mensajeDeError } from '@/utilidades/errores';

const almacen = useAlmacenAutenticacion();
const enrutador = useRouter();

const correo = ref('');
const clave = ref('');
const cargando = ref(false);
const error = ref('');
/** Solo aparece si el servidor tiene GOOGLE_CLIENT_ID. */
const conGoogle = ref(false);
const contenedorGoogle = ref<HTMLElement | null>(null);

async function enviar() {
  error.value = '';
  cargando.value = true;
  try {
    await almacen.ingresar(correo.value, clave.value);
    enrutador.push({ name: 'panel' });
  } catch {
    error.value = 'Correo o contrasena invalidos';
  } finally {
    cargando.value = false;
  }
}

async function ingresarConGoogle(credencial: string) {
  error.value = '';
  cargando.value = true;
  try {
    await almacen.ingresarConGoogle(credencial);
    enrutador.push({ name: 'panel' });
  } catch (e) {
    error.value = mensajeDeError(e, 'No se pudo iniciar sesion con Google');
  } finally {
    cargando.value = false;
  }
}

onMounted(async () => {
  const { googleClientId } = await opcionesPublicas();
  if (!googleClientId) return;
  conGoogle.value = true;
  // Se espera a que Vue pinte el contenedor antes de que Google dibuje el boton.
  await nextTick();
  try {
    if (contenedorGoogle.value) await mostrarBotonGoogle(contenedorGoogle.value, googleClientId, ingresarConGoogle);
  } catch {
    conGoogle.value = false;
  }
});
</script>

<template>
  <div :class="estilos.pagina">
    <form :class="estilos.tarjeta" @submit.prevent="enviar">
      <div :class="estilos.marca">
        <div :class="estilos.logo"><Icono nombre="gamepad-2" :tamano="21" /></div>
        <div>
          <div :class="estilos.nombreApp">Ludus</div>
          <div :class="estilos.subtitulo">Sistema de Juegos Educativos</div>
        </div>
      </div>

      <div :class="estilos.formulario">
        <p v-if="error" :class="estilos.error">{{ error }}</p>
        <CampoTexto v-model="correo" etiqueta="Correo" marcador="correo@institucion.mx" />
        <CampoTexto v-model="clave" etiqueta="Contrasena" tipo="clave" marcador="********" />
        <Boton variante="primario" tipo="submit" icono="log-in" :deshabilitado="cargando">
          {{ cargando ? 'Ingresando...' : 'Ingresar' }}
        </Boton>
        <template v-if="conGoogle">
          <div :class="estilos.separador"><span>o</span></div>
          <div ref="contenedorGoogle" :class="estilos.botonGoogle" />
        </template>
        <p :class="estilos.ayuda">
          Usuarios de ejemplo (clave "ludus123"): elena@ludus.io (superadmin),
          marta@nexum.edu.mx (admin), javier@nexum.edu.mx (docente),
          sergio@nexum.edu.mx (estudiante).
        </p>
      </div>
    </form>
  </div>
</template>
