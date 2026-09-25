/**
 * Carpetas de imagenes del juego, relativas a RUTA_ARCHIVOS.
 *
 * Se sirven tal cual en /archivos/<carpeta>/<archivo>, asi que el nombre de la
 * carpeta es parte de la URL publica.
 */
export const CARPETA_PERSONAJES = 'personajes';
export const CARPETA_FONDOS = 'fondos';

export const CARPETAS_ARCHIVOS = [CARPETA_PERSONAJES, CARPETA_FONDOS];

/** Prefijo publico bajo el que se sirve RUTA_ARCHIVOS. */
export const BASE_PUBLICA_ARCHIVOS = '/archivos';

/**
 * Fondo de la Mesa de Cumplimiento. Es una convencion de nombre, no un
 * registro en la base: basta con dejar el archivo en archivos/fondos/ para que
 * el juego lo use. Si no existe, la escena cae al degradado de respaldo.
 */
export const FONDO_MESA = `${BASE_PUBLICA_ARCHIVOS}/${CARPETA_FONDOS}/mesa-cumplimiento.png`;
