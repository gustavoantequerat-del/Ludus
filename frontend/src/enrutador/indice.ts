import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';
import type { Rol } from '@/tipos';

const TODOS: Rol[] = ['superadmin', 'admin_institucion', 'docente', 'estudiante'];
const STAFF: Rol[] = ['superadmin', 'admin_institucion', 'docente'];

const rutas: RouteRecordRaw[] = [
  {
    path: '/ingresar',
    name: 'ingresar',
    component: () => import('@/vistas/AutenticacionVista.vue'),
    meta: { publica: true },
  },
  {
    path: '/',
    name: 'panel',
    component: () => import('@/vistas/PanelVista.vue'),
    meta: { roles: TODOS },
  },
  {
    path: '/instituciones',
    name: 'instituciones',
    component: () => import('@/vistas/InstitucionesVista.vue'),
    meta: { roles: ['superadmin'] },
  },
  {
    path: '/usuarios',
    name: 'usuarios',
    component: () => import('@/vistas/UsuariosVista.vue'),
    meta: { roles: ['superadmin'] },
  },
  {
    path: '/docentes',
    name: 'docentes',
    component: () => import('@/vistas/UsuariosVista.vue'),
    meta: { roles: ['admin_institucion'], filtroRolFijo: 'docente' },
  },
  {
    path: '/estudiantes',
    name: 'estudiantes',
    component: () => import('@/vistas/UsuariosVista.vue'),
    meta: { roles: ['admin_institucion', 'docente'], filtroRolFijo: 'estudiante' },
  },
  {
    path: '/cursos',
    name: 'cursos',
    component: () => import('@/vistas/CursosVista.vue'),
    meta: { roles: TODOS },
  },
  {
    path: '/cursos/:id',
    name: 'curso-detalle',
    component: () => import('@/vistas/CursoDetalleVista.vue'),
    meta: { roles: TODOS },
    props: true,
  },
  {
    path: '/rutas',
    name: 'rutas',
    component: () => import('@/vistas/RutasVista.vue'),
    meta: { roles: TODOS },
  },
  {
    path: '/rutas/:id',
    name: 'ruta-detalle',
    component: () => import('@/vistas/RutaDetalleVista.vue'),
    meta: { roles: TODOS },
    props: true,
  },
  {
    path: '/explorar',
    name: 'explorar',
    component: () => import('@/vistas/ExplorarCursosVista.vue'),
    meta: { roles: ['estudiante'] },
  },
  {
    path: '/juegos',
    name: 'juegos',
    component: () => import('@/vistas/JuegosVista.vue'),
    meta: { roles: TODOS },
  },
  {
    path: '/cursos/:cursoId/modulos/:moduloId/configurar',
    name: 'configurar-juego',
    component: () => import('@/vistas/ConfiguracionJuegoVista.vue'),
    meta: { roles: STAFF },
    props: true,
  },
  {
    path: '/cursos/:cursoId/modulos/:moduloId/jugar',
    name: 'jugar',
    component: () => import('@/vistas/JugarVista.vue'),
    meta: { roles: ['estudiante'] },
    props: true,
  },
  {
    path: '/editor',
    name: 'editor',
    component: () => import('@/vistas/EditorVista.vue'),
    meta: { roles: STAFF },
  },
  {
    path: '/editor/:clave',
    name: 'editor-juego',
    component: () => import('@/vistas/EditorJuegoVista.vue'),
    meta: { roles: STAFF },
    props: true,
  },
  {
    path: '/scorm',
    name: 'scorm',
    component: () => import('@/vistas/PaquetesScormVista.vue'),
    meta: { roles: STAFF },
  },
  {
    path: '/solicitudes',
    name: 'solicitudes',
    component: () => import('@/vistas/SolicitudesVista.vue'),
    meta: { roles: ['superadmin', 'admin_institucion', 'estudiante'] },
  },
  {
    path: '/resultados',
    name: 'resultados',
    component: () => import('@/vistas/ResultadosVista.vue'),
    meta: { roles: TODOS },
  },
  {
    path: '/actividad',
    name: 'actividad',
    component: () => import('@/vistas/ActividadVista.vue'),
    meta: { roles: ['superadmin'] },
  },
  {
    path: '/ajustes',
    name: 'ajustes',
    component: () => import('@/vistas/AjustesVista.vue'),
    meta: { roles: TODOS },
  },
];

export const enrutador = createRouter({
  history: createWebHistory(),
  routes: rutas,
});

enrutador.beforeEach((hacia) => {
  const almacen = useAlmacenAutenticacion();

  if (hacia.meta.publica) {
    if (almacen.estaAutenticado) return { name: 'panel' };
    return true;
  }
  if (!almacen.estaAutenticado) {
    return { name: 'ingresar' };
  }
  const rolesPermitidos = hacia.meta.roles as Rol[] | undefined;
  if (rolesPermitidos && !rolesPermitidos.includes(almacen.usuario!.rol)) {
    return { name: 'panel' };
  }
  return true;
});
