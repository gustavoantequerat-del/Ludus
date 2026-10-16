/**
 * Google Analytics 4 (gtag.js), opcional.
 *
 * Solo se carga si el servidor tiene GOOGLE_ANALYTICS_ID. Las condiciones de
 * Google prohiben enviarle datos que identifiquen a la persona (correo,
 * nombre), asi que solo viajan el id interno de Ludus como user_id y el rol y
 * la institucion como propiedades. Quien entro con que correo queda en el
 * registro de accesos de Ludus, no aqui.
 */
import type { UsuarioAutenticado } from '@/tipos';

type Comando = unknown[];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...argumentos: unknown[]) => void;
  }
}

let idMedicion: string | null = null;
/** Lo que se pidio registrar antes de saber si hay Analytics. */
let pendientes: Comando[] | null = [];

function enviar(...comando: Comando) {
  if (pendientes) {
    pendientes.push(comando);
    return;
  }
  if (idMedicion && window.gtag) window.gtag(...comando);
}

/** Llamar una vez con el id (o null). A partir de ahi los eventos salen o se descartan. */
export function iniciarAnalitica(id: string | null) {
  const cola = pendientes ?? [];
  pendientes = null;
  if (!id) return;

  idMedicion = id;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js espera el objeto arguments tal cual, no un arreglo.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  // La vista de pagina se manda a mano en cada cambio de ruta (es una SPA).
  window.gtag('config', id, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);

  cola.forEach((comando) => window.gtag!(...comando));
}

/**
 * Una pantalla vista. Se manda el nombre de la ruta como titulo para que los
 * informes agrupen "curso-detalle" y no cada curso por separado.
 */
export function registrarVista(nombreRuta: string, ruta: string) {
  enviar('event', 'page_view', {
    page_title: nombreRuta,
    page_path: ruta,
    page_location: window.location.origin + ruta,
  });
}

/** Asocia la sesion de Analytics a la cuenta, sin datos personales. */
export function identificarUsuario(usuario: UsuarioAutenticado | null) {
  if (!usuario) {
    enviar('set', { user_id: null });
    return;
  }
  enviar('set', { user_id: usuario.sub });
  enviar('set', 'user_properties', {
    rol: usuario.rol,
    institucion_id: usuario.institucionId ?? 'global',
  });
}

/** Evento recomendado de GA4 para el inicio de sesion. */
export function registrarIngreso(metodo: 'clave' | 'google') {
  enviar('event', 'login', { method: metodo });
}
