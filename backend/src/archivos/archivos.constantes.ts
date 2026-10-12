/**
 * Carpetas de imagenes del juego, relativas a RUTA_ARCHIVOS.
 *
 * Se sirven tal cual en /archivos/<carpeta>/<archivo>, asi que el nombre de la
 * carpeta es parte de la URL publica.
 */
export const CARPETA_PERSONAJES = 'personajes';
export const CARPETA_FONDOS = 'fondos';
/** Iconos y fichas de los mazos del Memorama y el Mahjong. */
export const CARPETA_FICHAS = 'fichas';
/** Videos del Runner Narrativo. */
export const CARPETA_VIDEOS = 'videos';

export const CARPETAS_ARCHIVOS = [CARPETA_PERSONAJES, CARPETA_FONDOS, CARPETA_FICHAS, CARPETA_VIDEOS];

/**
 * Nombre que reciben los archivos subidos desde la aplicacion. Lo que alguien
 * dejo a mano en una carpeta (como los iconos base) tiene otro nombre y nunca
 * se borra solo.
 */
export const PATRON_ARCHIVO_SUBIDO = /\/[0-9a-f]{16}\.(png|jpg|webp|mp4)$/;

/** Prefijo publico bajo el que se sirve RUTA_ARCHIVOS. */
export const BASE_PUBLICA_ARCHIVOS = '/archivos';

/**
 * Fondo de la Mesa de Cumplimiento. Es una convencion de nombre, no un
 * registro en la base: basta con dejar el archivo en archivos/fondos/ para que
 * el juego lo use. Si no existe, la escena cae al degradado de respaldo.
 */
export const FONDO_MESA = `${BASE_PUBLICA_ARCHIVOS}/${CARPETA_FONDOS}/mesa-cumplimiento.png`;
