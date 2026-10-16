/**
 * Boton "Continuar con Google" (Google Identity Services). Google entrega un
 * ID token firmado y el backend lo verifica: aqui no se decide nada.
 */

interface RespuestaCredencial {
  credential: string;
}

interface IdentidadGoogle {
  accounts: {
    id: {
      initialize(opciones: {
        client_id: string;
        callback: (respuesta: RespuestaCredencial) => void;
        ux_mode?: 'popup' | 'redirect';
      }): void;
      renderButton(contenedor: HTMLElement, opciones: Record<string, unknown>): void;
    };
  };
}

declare global {
  interface Window {
    google?: IdentidadGoogle;
  }
}

const URL_SCRIPT = 'https://accounts.google.com/gsi/client';
let carga: Promise<IdentidadGoogle> | null = null;

function cargarScript(): Promise<IdentidadGoogle> {
  carga ??= new Promise((resolver, rechazar) => {
    if (window.google?.accounts) {
      resolver(window.google);
      return;
    }
    const script = document.createElement('script');
    script.src = URL_SCRIPT;
    script.async = true;
    script.onload = () => (window.google ? resolver(window.google) : rechazar(new Error('Google no cargo')));
    script.onerror = () => {
      carga = null;
      rechazar(new Error('No se pudo cargar el boton de Google'));
    };
    document.head.appendChild(script);
  });
  return carga;
}

export async function mostrarBotonGoogle(
  contenedor: HTMLElement,
  clientId: string,
  alRecibirCredencial: (credencial: string) => void,
) {
  const google = await cargarScript();
  google.accounts.id.initialize({
    client_id: clientId,
    callback: (respuesta) => alRecibirCredencial(respuesta.credential),
    ux_mode: 'popup',
  });
  google.accounts.id.renderButton(contenedor, {
    type: 'standard',
    theme: 'filled_black',
    size: 'large',
    shape: 'pill',
    text: 'continue_with',
    locale: 'es',
    width: contenedor.clientWidth || 320,
  });
}
