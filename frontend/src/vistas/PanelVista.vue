<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import estilos from './PanelVista.module.css';
import Encabezado from '@/componentes/base/Encabezado.vue';
import TarjetaKpi from '@/componentes/base/TarjetaKpi.vue';
import Boton from '@/componentes/base/Boton.vue';
import Icono from '@/componentes/base/Icono.vue';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import { panelServicio } from '@/servicios/panel.servicio';
import { solicitudesServicio } from '@/servicios/solicitudes.servicio';
import { cursosServicio } from '@/servicios/cursos.servicio';
import { resultadosServicio } from '@/servicios/resultados.servicio';
import { usarNotificaciones } from '@/composables/usarNotificaciones';
import { iniciales, formatoFecha } from '@/utilidades/texto';
import type { Curso, EventoActividad, Resultado, Solicitud } from '@/tipos';

const almacen = useAlmacenAutenticacion();
const enrutador = useRouter();
const { notificar } = usarNotificaciones();

const rol = computed(() => almacen.usuario!.rol);
const kpis = ref<{ etiqueta: string; valor: string | number; icono: string }[]>([]);
const pendientes = ref<Solicitud[]>([]);
const actividad = ref<EventoActividad[]>([]);
const progreso = ref<{ nombre: string; pct: number }[]>([]);

const titulo = computed(() => {
  if (rol.value === 'estudiante') return `Hola, ${almacen.usuario!.nombre.split(' ')[0]}`;
  return 'Dashboard';
});
const subtitulo = computed(() => {
  if (rol.value === 'superadmin') return 'Vista global de todas las instituciones del sistema.';
  if (rol.value === 'admin_institucion') return 'Resumen de tu institucion: usuarios, cursos, rutas y solicitudes.';
  if (rol.value === 'docente') return 'Resumen de tus cursos, rutas y el avance de tus estudiantes.';
  return 'Continua donde te quedaste.';
});

async function cargar() {
  const resumen: any = await panelServicio.resumen();

  if (rol.value === 'superadmin') {
    kpis.value = [
      { etiqueta: 'Instituciones', valor: resumen.totalInstituciones, icono: 'building-2' },
      { etiqueta: 'Usuarios', valor: resumen.totalUsuarios, icono: 'users' },
      { etiqueta: 'Docentes', valor: resumen.totalDocentes, icono: 'user-round-cog' },
      { etiqueta: 'Estudiantes', valor: resumen.totalEstudiantes, icono: 'graduation-cap' },
      { etiqueta: 'Cursos', valor: resumen.totalCursos, icono: 'book-open' },
      { etiqueta: 'Rutas', valor: resumen.totalRutas, icono: 'route' },
    ];
    actividad.value = await panelServicio.actividad();
  } else if (rol.value === 'admin_institucion') {
    kpis.value = [
      { etiqueta: 'Docentes', valor: resumen.totalDocentes, icono: 'user-round-cog' },
      { etiqueta: 'Estudiantes', valor: resumen.totalEstudiantes, icono: 'graduation-cap' },
      { etiqueta: 'Cursos', valor: resumen.totalCursos, icono: 'book-open' },
      { etiqueta: 'Rutas', valor: resumen.totalRutas, icono: 'route' },
      { etiqueta: 'Solicitudes', valor: resumen.solicitudesPendientes, icono: 'inbox' },
    ];
    const todas = await solicitudesServicio.listar();
    pendientes.value = todas.filter((s) => s.estado === 'pendiente').slice(0, 3);
  } else if (rol.value === 'docente') {
    kpis.value = [
      { etiqueta: 'Mis cursos', valor: resumen.misCursos, icono: 'book-open' },
      { etiqueta: 'Mis rutas', valor: resumen.misRutas, icono: 'route' },
      { etiqueta: 'Estudiantes', valor: resumen.totalEstudiantes, icono: 'graduation-cap' },
      { etiqueta: 'Juegos configurados', valor: resumen.juegosConfigurados, icono: 'gamepad-2' },
    ];
  } else {
    kpis.value = [
      { etiqueta: 'Mis cursos', valor: resumen.misCursos, icono: 'book-open' },
      { etiqueta: 'Mis rutas', valor: resumen.misRutas, icono: 'route' },
    ];
    const [misCursos, misResultados]: [Curso[], Resultado[]] = await Promise.all([
      cursosServicio.listar(),
      resultadosServicio.listar(),
    ]);
    progreso.value = misCursos.map((curso) => {
      const completados = new Set(
        misResultados.filter((r) => r.modulo.cursoId === curso.id).map((r) => r.moduloId),
      ).size;
      const total = curso.totalModulos || 1;
      return { nombre: curso.nombre, pct: Math.round((completados / total) * 100) };
    });
  }
}

async function resolver(solicitud: Solicitud, estado: 'aprobada' | 'rechazada') {
  await solicitudesServicio.resolver(solicitud.id, estado);
  notificar(estado === 'aprobada' ? 'Solicitud aprobada' : 'Solicitud rechazada');
  await cargar();
}

onMounted(cargar);
</script>

<template>
  <Encabezado :titulo="titulo" :subtitulo="subtitulo" />

  <div :class="estilos.columna">
    <TarjetaKpi :items="kpis" />

    <div :class="estilos.paneles">
      <div v-if="pendientes.length > 0" :class="[estilos.panel, estilos.panelDestacado]">
        <div :class="estilos.panelCabecera">
          <Icono nombre="inbox" :tamano="18" />
          <h3 :class="estilos.panelTitulo">Solicitudes pendientes</h3>
          <button :class="estilos.verTodas" @click="enrutador.push({ name: 'solicitudes' })">
            Ver todas
          </button>
        </div>
        <div v-for="s in pendientes" :key="s.id" :class="estilos.solicitud">
          <span :class="estilos.avatar">{{ iniciales(s.estudiante.nombre) }}</span>
          <div :class="estilos.solicitudTextos">
            <span :class="estilos.solicitudNombre">{{ s.estudiante.nombre }}</span>
            <span :class="estilos.solicitudDesc">
              {{ s.tipo === 'ingreso' ? 'Solicita entrar a ' : 'Solicita salir de ' }}
              {{ s.curso?.nombre ?? s.ruta?.nombre }}
            </span>
          </div>
          <div :class="estilos.solicitudAcciones">
            <Boton variante="primario" @click="resolver(s, 'aprobada')">Aceptar</Boton>
            <Boton variante="secundario" @click="resolver(s, 'rechazada')">Rechazar</Boton>
          </div>
        </div>
      </div>

      <div v-if="rol === 'estudiante'" :class="estilos.panel">
        <div :class="estilos.panelCabecera">
          <Icono nombre="trending-up" :tamano="18" />
          <h3 :class="estilos.panelTitulo">Mi avance</h3>
        </div>
        <div v-for="p in progreso" :key="p.nombre" :class="estilos.progresoFila">
          <div :class="estilos.progresoCabecera">
            <span :class="estilos.progresoNombre">{{ p.nombre }}</span>
            <span :class="estilos.progresoPct">{{ p.pct }}%</span>
          </div>
          <div :class="estilos.barra">
            <div :class="estilos.barraRelleno" :style="{ width: p.pct + '%' }" />
          </div>
        </div>
      </div>

      <div v-if="rol === 'superadmin'" :class="estilos.panel">
        <div :class="estilos.panelCabecera">
          <Icono nombre="activity" :tamano="18" />
          <h3 :class="estilos.panelTitulo">Actividad reciente</h3>
        </div>
        <div v-for="(a, indice) in actividad" :key="indice" :class="estilos.actividadFila">
          <span :class="estilos.actividadIcono"><Icono nombre="activity" :tamano="14" /></span>
          <div :class="estilos.actividadTextos">
            <span :class="estilos.actividadTexto">{{ a.texto }}</span>
            <span :class="estilos.actividadCuando">{{ formatoFecha(a.cuando) }} · {{ a.institucion }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
