import { join } from 'path';
import { ConexionBd, leerConexionBd } from './conexion-bd';

export interface ConfiguracionApp {
  puerto: number;
  baseDeDatos: ConexionBd;
  jwt: {
    secreto: string;
    expiracion: string;
  };
  /**
   * URL publica de esta API. El paquete SCORM se ejecuta dentro de otro sitio
   * (el LMS), asi que necesita una direccion absoluta y alcanzable desde ahi.
   */
  urlPublicaApi: string;
  /**
   * Carpeta en disco con las imagenes del juego (personajes y fondos). Se sirve
   * tal cual en /archivos, sin el prefijo /api: son estaticos, no endpoints.
   */
  rutaArchivos: string;
  /**
   * Servicios de Google, opcionales. Sin GOOGLE_CLIENT_ID el boton "Continuar
   * con Google" no aparece; sin GOOGLE_ANALYTICS_ID no se carga Analytics.
   * El frontend los lee en tiempo de ejecucion (GET /autenticacion/opciones),
   * asi que cambiarlos no exige recompilarlo.
   */
  google: {
    clientId: string;
    analyticsId: string;
  };
}

export default (): ConfiguracionApp => ({
  puerto: Number(process.env.PUERTO || process.env.PORT) || 3000,
  baseDeDatos: leerConexionBd(),
  jwt: {
    secreto: process.env.JWT_SECRETO || 'cambia-este-valor-en-produccion',
    expiracion: process.env.JWT_EXPIRACION || '8h',
  },
  urlPublicaApi:
    process.env.URL_PUBLICA_API ||
    `http://localhost:${Number(process.env.PUERTO || process.env.PORT) || 3000}/api`,
  rutaArchivos: process.env.RUTA_ARCHIVOS || join(process.cwd(), 'archivos'),
  google: {
    clientId: (process.env.GOOGLE_CLIENT_ID || '').trim(),
    analyticsId: (process.env.GOOGLE_ANALYTICS_ID || '').trim(),
  },
});
