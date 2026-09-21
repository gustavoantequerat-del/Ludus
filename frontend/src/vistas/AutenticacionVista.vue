<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './AutenticacionVista.module.css';
import Icono from '@/componentes/base/Icono.vue';
import Boton from '@/componentes/base/Boton.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';

const almacen = useAlmacenAutenticacion();
const enrutador = useRouter();

const correo = ref('');
const clave = ref('');
const cargando = ref(false);
const error = ref('');

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
        <p :class="estilos.ayuda">
          Usuarios de ejemplo (clave "ludus123"): elena@ludus.io (superadmin),
          marta@nexum.edu.mx (admin), javier@nexum.edu.mx (docente),
          sergio@nexum.edu.mx (estudiante).
        </p>
      </div>
    </form>
  </div>
</template>
