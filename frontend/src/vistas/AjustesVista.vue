<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './AjustesVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Icono from '@/componentes/base/Icono.vue';
import Boton from '@/componentes/base/Boton.vue';
import CampoTexto from '@/componentes/base/CampoTexto.vue';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { autenticacionServicio } from '@/servicios/autenticacion.servicio';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { etiquetaRol } from '@/utilidades/texto';
import type { Rol } from '@/tipos';

const almacen = useAlmacenAutenticacion();
const enrutador = useRouter();
const { notificar } = usarNotificaciones();

const perfil = ref({
  nombre: almacen.usuario?.nombre ?? '',
  correo: almacen.usuario?.correo ?? '',
});
const guardandoPerfil = ref(false);
const errorPerfil = ref('');

const claves = ref({ actual: '', nueva: '', confirmacion: '' });
const guardandoClave = ref(false);
const errorClave = ref('');
const exitoClave = ref('');

function mensajeDeError(error: unknown, respaldo: string): string {
  const detalle = (error as { response?: { data?: { message?: string | string[] } } })?.response
    ?.data?.message;
  if (Array.isArray(detalle)) return detalle[0];
  return detalle ?? respaldo;
}

async function guardarPerfil() {
  errorPerfil.value = '';
  if (!perfil.value.nombre.trim() || !perfil.value.correo.trim()) {
    errorPerfil.value = 'El nombre y el correo son obligatorios';
    return;
  }
  guardandoPerfil.value = true;
  try {
    await almacen.actualizarPerfil({
      nombre: perfil.value.nombre.trim(),
      correo: perfil.value.correo.trim(),
    });
    notificar('Perfil actualizado');
  } catch (error) {
    errorPerfil.value = mensajeDeError(error, 'No se pudo actualizar el perfil');
  } finally {
    guardandoPerfil.value = false;
  }
}

async function guardarClave() {
  errorClave.value = '';
  exitoClave.value = '';
  if (claves.value.nueva.length < 6) {
    errorClave.value = 'La contrasena nueva debe tener al menos 6 caracteres';
    return;
  }
  if (claves.value.nueva !== claves.value.confirmacion) {
    errorClave.value = 'La confirmacion no coincide con la contrasena nueva';
    return;
  }
  guardandoClave.value = true;
  try {
    await autenticacionServicio.cambiarClave(claves.value.actual, claves.value.nueva);
    claves.value = { actual: '', nueva: '', confirmacion: '' };
    exitoClave.value = 'Contrasena actualizada';
    notificar('Contrasena actualizada');
  } catch (error) {
    errorClave.value = mensajeDeError(error, 'No se pudo cambiar la contrasena');
  } finally {
    guardandoClave.value = false;
  }
}

function cerrarSesion() {
  almacen.cerrarSesion();
  enrutador.push({ name: 'ingresar' });
}

const PERMISOS: Record<Rol, { icono: string; etiqueta: string; valor: string; tono: string }[]> = {
  superadmin: [
    { icono: 'building-2', etiqueta: 'Instituciones', valor: 'CRUD total', tono: 'var(--exito)' },
    { icono: 'users', etiqueta: 'Usuarios (todos los roles)', valor: 'CRUD total', tono: 'var(--exito)' },
    { icono: 'book-open', etiqueta: 'Cursos y rutas', valor: 'CRUD total', tono: 'var(--exito)' },
    { icono: 'globe', etiqueta: 'Alcance', valor: 'Global', tono: 'var(--secundario)' },
  ],
  admin_institucion: [
    { icono: 'graduation-cap', etiqueta: 'Estudiantes', valor: 'CRUD', tono: 'var(--exito)' },
    { icono: 'user-round-cog', etiqueta: 'Docentes', valor: 'CRUD', tono: 'var(--exito)' },
    { icono: 'book-open', etiqueta: 'Cursos y rutas', valor: 'CRUD', tono: 'var(--exito)' },
    { icono: 'inbox', etiqueta: 'Solicitudes', valor: 'Resolver', tono: 'var(--secundario)' },
    { icono: 'building-2', etiqueta: 'Otras instituciones', valor: 'Sin acceso', tono: 'var(--error)' },
  ],
  docente: [
    { icono: 'book-open', etiqueta: 'Cursos propios', valor: 'CRUD', tono: 'var(--exito)' },
    { icono: 'route', etiqueta: 'Rutas propias', valor: 'CRUD', tono: 'var(--exito)' },
    { icono: 'gamepad-2', etiqueta: 'Configurar juegos', valor: 'Permitido', tono: 'var(--exito)' },
    { icono: 'users', etiqueta: 'Usuarios', valor: 'Solo consulta', tono: 'var(--alerta)' },
    { icono: 'building-2', etiqueta: 'Instituciones', valor: 'Sin acceso', tono: 'var(--error)' },
  ],
  estudiante: [
    { icono: 'book-open', etiqueta: 'Cursos asignados', valor: 'Jugar', tono: 'var(--exito)' },
    { icono: 'inbox', etiqueta: 'Inscripcion y salida', valor: 'Solicitar', tono: 'var(--secundario)' },
    { icono: 'award', etiqueta: 'Calificaciones', valor: 'Consultar', tono: 'var(--secundario)' },
    { icono: 'sliders-horizontal', etiqueta: 'Configurar juegos', valor: 'Sin acceso', tono: 'var(--error)' },
  ],
};

const permisos = computed(() => PERMISOS[almacen.usuario!.rol]);
</script>

<template>
  <Encabezado titulo="Mi perfil" subtitulo="Datos de la cuenta, contrasena y permisos vigentes de este rol." />

  <div :class="estilos.cuadricula">
    <div :class="estilos.panel">
      <h3 :class="estilos.panelTitulo">Datos de la cuenta</h3>
      <p v-if="errorPerfil" :class="estilos.mensajeError">{{ errorPerfil }}</p>
      <CampoTexto v-model="perfil.nombre" etiqueta="Nombre" marcador="Nombre y apellido" />
      <CampoTexto v-model="perfil.correo" etiqueta="Correo" marcador="correo@institucion.mx" />
      <div :class="estilos.campoSoloLectura">
        <span :class="estilos.etiqueta">Rol</span>
        <div :class="estilos.soloLectura">{{ etiquetaRol(almacen.usuario?.rol ?? '') }}</div>
      </div>
      <div :class="estilos.acciones">
        <Boton variante="primario" icono="save" :deshabilitado="guardandoPerfil" @click="guardarPerfil">
          {{ guardandoPerfil ? 'Guardando...' : 'Guardar cambios' }}
        </Boton>
        <Boton variante="secundario" icono="log-out" @click="cerrarSesion">Cerrar sesion</Boton>
      </div>
    </div>

    <div :class="estilos.panel">
      <h3 :class="estilos.panelTitulo">Cambiar contrasena</h3>
      <p v-if="errorClave" :class="estilos.mensajeError">{{ errorClave }}</p>
      <p v-if="exitoClave" :class="estilos.mensajeExito">{{ exitoClave }}</p>
      <CampoTexto
        v-model="claves.actual"
        etiqueta="Contrasena actual"
        tipo="clave"
        marcador="Tu contrasena vigente"
      />
      <CampoTexto
        v-model="claves.nueva"
        etiqueta="Contrasena nueva"
        tipo="clave"
        marcador="Minimo 6 caracteres"
      />
      <CampoTexto
        v-model="claves.confirmacion"
        etiqueta="Confirmar contrasena nueva"
        tipo="clave"
        marcador="Repite la contrasena nueva"
      />
      <div :class="estilos.acciones">
        <Boton
          variante="primario"
          icono="key-round"
          :deshabilitado="guardandoClave"
          @click="guardarClave"
        >
          {{ guardandoClave ? 'Actualizando...' : 'Actualizar contrasena' }}
        </Boton>
      </div>
    </div>

    <div :class="estilos.panel">
      <h3 :class="estilos.panelTitulo">Permisos de este rol</h3>
      <div v-for="p in permisos" :key="p.etiqueta" :class="estilos.permiso">
        <Icono :nombre="p.icono" :tamano="16" :style="{ color: p.tono }" />
        <span :class="estilos.permisoTexto">{{ p.etiqueta }}</span>
        <span :class="estilos.permisoValor" :style="{ color: p.tono }">{{ p.valor }}</span>
      </div>
    </div>
  </div>
</template>
