import { join } from 'path';

export interface ConfiguracionApp {
  puerto: number;
  baseDeDatos: {
    host: string;
    puerto: number;
    usuario: string;
    clave: string;
    nombre: string;
  };
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
}

export default (): ConfiguracionApp => ({
  puerto: Number(process.env.PUERTO) || 3000,
  baseDeDatos: {
    host: process.env.DB_HOST || 'localhost',
    puerto: Number(process.env.DB_PUERTO) || 5432,
    usuario: process.env.DB_USUARIO || 'sistema_juegos',
    clave: process.env.DB_CLAVE || 'sistema_juegos',
    nombre: process.env.DB_NOMBRE || 'sistema_juegos',
  },
  jwt: {
    secreto: process.env.JWT_SECRETO || 'cambia-este-valor-en-produccion',
    expiracion: process.env.JWT_EXPIRACION || '8h',
  },
  urlPublicaApi:
    process.env.URL_PUBLICA_API || `http://localhost:${Number(process.env.PUERTO) || 3000}/api`,
  rutaArchivos: process.env.RUTA_ARCHIVOS || join(process.cwd(), 'archivos'),
});
