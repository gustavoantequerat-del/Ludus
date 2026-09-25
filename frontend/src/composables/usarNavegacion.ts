import { computed } from 'vue';
import { useAlmacenAutenticacion } from '@/almacenes/autenticacion';

export interface ItemNavegacion {
  ruta: string;
  etiqueta: string;
  icono: string;
}

const NAV_POR_ROL: Record<string, ItemNavegacion[]> = {
  superadmin: [
    { ruta: 'panel', etiqueta: 'Dashboard', icono: 'layout-dashboard' },
    { ruta: 'instituciones', etiqueta: 'Instituciones', icono: 'building-2' },
    { ruta: 'usuarios', etiqueta: 'Usuarios', icono: 'users' },
    { ruta: 'cursos', etiqueta: 'Cursos', icono: 'book-open' },
    { ruta: 'rutas', etiqueta: 'Rutas', icono: 'route' },
    { ruta: 'juegos', etiqueta: 'Juegos', icono: 'gamepad-2' },
    { ruta: 'scorm', etiqueta: 'Paquetes SCORM', icono: 'package' },
    { ruta: 'actividad', etiqueta: 'Actividad', icono: 'activity' },
    { ruta: 'ajustes', etiqueta: 'Mi perfil', icono: 'user-round-cog' },
  ],
  admin_institucion: [
    { ruta: 'panel', etiqueta: 'Dashboard', icono: 'layout-dashboard' },
    { ruta: 'estudiantes', etiqueta: 'Estudiantes', icono: 'graduation-cap' },
    { ruta: 'docentes', etiqueta: 'Docentes', icono: 'user-round-cog' },
    { ruta: 'cursos', etiqueta: 'Cursos', icono: 'book-open' },
    { ruta: 'rutas', etiqueta: 'Rutas', icono: 'route' },
    { ruta: 'solicitudes', etiqueta: 'Solicitudes', icono: 'inbox' },
    { ruta: 'juegos', etiqueta: 'Juegos', icono: 'gamepad-2' },
    { ruta: 'scorm', etiqueta: 'Paquetes SCORM', icono: 'package' },
    { ruta: 'ajustes', etiqueta: 'Mi perfil', icono: 'user-round-cog' },
  ],
  docente: [
    { ruta: 'panel', etiqueta: 'Dashboard', icono: 'layout-dashboard' },
    { ruta: 'cursos', etiqueta: 'Mis cursos', icono: 'book-open' },
    { ruta: 'rutas', etiqueta: 'Mis rutas', icono: 'route' },
    { ruta: 'juegos', etiqueta: 'Juegos', icono: 'gamepad-2' },
    { ruta: 'scorm', etiqueta: 'Paquetes SCORM', icono: 'package' },
    { ruta: 'estudiantes', etiqueta: 'Estudiantes', icono: 'graduation-cap' },
    { ruta: 'resultados', etiqueta: 'Resultados', icono: 'bar-chart-3' },
  ],
  estudiante: [
    { ruta: 'panel', etiqueta: 'Inicio', icono: 'house' },
    { ruta: 'cursos', etiqueta: 'Mis cursos', icono: 'book-open' },
    { ruta: 'rutas', etiqueta: 'Mis rutas', icono: 'route' },
    { ruta: 'explorar', etiqueta: 'Explorar cursos', icono: 'compass' },
    { ruta: 'solicitudes', etiqueta: 'Solicitudes', icono: 'inbox' },
    { ruta: 'resultados', etiqueta: 'Calificaciones', icono: 'award' },
  ],
};

export function usarNavegacion() {
  const almacen = useAlmacenAutenticacion();
  const items = computed(() => NAV_POR_ROL[almacen.usuario?.rol ?? ''] ?? []);
  return { items };
}
