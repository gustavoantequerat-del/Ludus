/**
 * Las imagenes del juego las sirve el backend en /archivos, fuera del prefijo
 * /api. En desarrollo Vite hace proxy de esa ruta; si VITE_URL_API apunta a
 * otro host, hay que anteponer ese host.
 */
const URL_API = import.meta.env.VITE_URL_API ?? '';

export function urlArchivo(ruta: string | null | undefined): string {
  if (!ruta) return '';
  if (/^https?:\/\//.test(ruta)) return ruta;
  if (!URL_API) return ruta;
  return URL_API.replace(/\/api\/?$/, '') + ruta;
}

/** Lee un archivo del disco del usuario como data URL para poder subirlo. */
export function leerComoDataUrl(archivo: File): Promise<string> {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onload = () => resolver(String(lector.result));
    lector.onerror = () => rechazar(new Error('No se pudo leer el archivo'));
    lector.readAsDataURL(archivo);
  });
}
