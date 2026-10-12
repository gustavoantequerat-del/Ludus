import type { Juego, TipoJuego } from '@/tipos';

/** Los dos sectores del catalogo, en el orden en que se muestran. */
export const SECTORES: { tipo: TipoJuego; titulo: string; descripcion: string; icono: string }[] = [
  {
    tipo: 'evaluacion',
    titulo: 'Evaluacion',
    descripcion: 'Miden lo aprendido en el curso y pueden generar calificacion.',
    icono: 'graduation-cap',
  },
  {
    tipo: 'ludico',
    titulo: 'Ludico',
    descripcion: 'Para jugar y despejarse: no hace falta saber el tema y nunca califican.',
    icono: 'party-popper',
  },
];

/** El catalogo partido por sector; un sector sin juegos no aparece. */
export function porSector(juegos: Juego[]) {
  return SECTORES.map((sector) => ({
    ...sector,
    juegos: juegos.filter((juego) => juego.tipo === sector.tipo),
  })).filter((sector) => sector.juegos.length > 0);
}
