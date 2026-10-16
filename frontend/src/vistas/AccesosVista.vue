<script setup lang="ts">
/**
 * Registro de accesos: que cuenta entro, cuando y por donde. Es el dato que
 * Google Analytics no puede guardar (no admite correos), asi que vive en Ludus.
 */
import { computed, onMounted, ref, watch } from 'vue';
import estilos from './AccesosVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import Tabla from '@/componentes/base/Tabla.vue';
import CeldaPersona from '@/componentes/base/CeldaPersona.vue';
import Insignia from '@/componentes/base/Insignia.vue';
import CampoSelector from '@/componentes/base/CampoSelector.vue';
import TarjetaKpi from '@/componentes/base/TarjetaKpi.vue';
import { accesosServicio } from '@/servicios/accesos.servicio';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { etiquetaRol } from '@/utilidades/texto';
import type { Acceso, ListadoAccesos } from '@/tipos';

const almacen = useAlmacenAutenticacion();
const esSuperadmin = almacen.usuario?.rol === 'superadmin';

const listado = ref<ListadoAccesos | null>(null);
const dias = ref('30');
const busqueda = ref('');
const cargando = ref(true);

const ETIQUETA_METODO: Record<Acceso['metodo'], string> = {
  clave: 'Correo y clave',
  google: 'Google',
  scorm: 'Paquete SCORM',
};

const kpis = computed(() => {
  const r = listado.value?.resumen;
  return [
    { etiqueta: 'Ultimas 24 h', valor: r?.ultimas24h ?? 0, icono: 'clock' },
    { etiqueta: `Accesos en ${dias.value} dias`, valor: r?.total ?? 0, icono: 'log-in' },
    { etiqueta: 'Cuentas distintas', valor: r?.usuariosDistintos ?? 0, icono: 'users' },
  ];
});

const columnas = computed(() => [
  { etiqueta: 'Cuenta', flex: 1.8 },
  { etiqueta: 'Rol', flex: 0.9 },
  ...(esSuperadmin ? [{ etiqueta: 'Institucion', flex: 0.9 }] : []),
  { etiqueta: 'Metodo', flex: 0.9 },
  { etiqueta: 'Fecha y hora', flex: 1.1 },
  { etiqueta: 'IP', flex: 0.9 },
]);

const filtrados = computed(() => {
  const texto = busqueda.value.toLowerCase();
  return (listado.value?.accesos ?? []).filter(
    (a) => a.usuario.nombre.toLowerCase().includes(texto) || a.usuario.correo.toLowerCase().includes(texto),
  );
});

function fechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function cargar() {
  cargando.value = true;
  listado.value = await accesosServicio.listar(Number(dias.value));
  cargando.value = false;
}

watch(dias, cargar);
onMounted(cargar);
</script>

<template>
  <Encabezado
    titulo="Accesos"
    subtitulo="Cada inicio de sesion: que cuenta entro, cuando y por donde. Se muestran los ultimos 500."
  />

  <TarjetaKpi :items="kpis" />

  <Tabla v-if="!cargando" :columnas="columnas" :items="filtrados" v-model:busqueda="busqueda">
    <template #filtros>
      <CampoSelector
        v-model="dias"
        etiqueta=""
        :opciones="[
          { valor: '1', texto: 'Ultimo dia' },
          { valor: '7', texto: 'Ultimos 7 dias' },
          { valor: '30', texto: 'Ultimos 30 dias' },
          { valor: '90', texto: 'Ultimos 90 dias' },
        ]"
      />
    </template>
    <template #fila="{ item }">
      <div :class="estilos.celdaCuenta">
        <CeldaPersona :nombre="item.usuario.nombre" :detalle="item.usuario.correo" />
      </div>
      <div :class="estilos.celdaRol">{{ etiquetaRol(item.usuario.rol) }}</div>
      <div v-if="esSuperadmin" :class="estilos.celdaInstitucion">{{ item.usuario.institucion ?? 'Global' }}</div>
      <div :class="estilos.celdaMetodo">
        <Insignia :tono="item.metodo === 'google' ? 'info' : item.metodo === 'scorm' ? 'alerta' : 'primario'">
          {{ ETIQUETA_METODO[item.metodo as Acceso['metodo']] }}
        </Insignia>
      </div>
      <div :class="estilos.celdaFecha">{{ fechaHora(item.creadoEn) }}</div>
      <div :class="estilos.celdaIp" :title="item.agente ?? ''">{{ item.ip ?? '—' }}</div>
    </template>
  </Tabla>
</template>
