export function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map((palabra) => palabra[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const ETIQUETAS_ROL: Record<string, string> = {
  superadmin: 'Superadministrador',
  admin_institucion: 'Admin institucion',
  docente: 'Docente',
  estudiante: 'Estudiante',
};

export function etiquetaRol(rol: string): string {
  return ETIQUETAS_ROL[rol] ?? rol;
}

export function formatoFecha(fechaIso: string): string {
  return new Date(fechaIso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  });
}
