/**
 * Un solo lugar donde se decide como conectar a PostgreSQL.
 *
 * Lo necesitan cuatro puntos de entrada distintos (la aplicacion, el CLI de
 * migraciones, la semilla y el diagnostico), y al desplegar es justo lo que
 * cambia: por eso vive aparte y no repetido en cada uno.
 *
 * Acepta las dos formas en que los proveedores entregan una base:
 * - `DATABASE_URL` completa (Neon, Render, Railway, Supabase).
 * - Las variables sueltas `DB_HOST`, `DB_PUERTO`, ... (cPanel, local).
 */

export interface ConexionBd {
  /** Solo cuando se configuro con DATABASE_URL. */
  url?: string;
  host: string;
  puerto: number;
  usuario: string;
  clave: string;
  nombre: string;
  /** TLS obligatorio: casi todos los Postgres gestionados lo exigen. */
  ssl: boolean;
}

export function leerConexionBd(): ConexionBd {
  const url = (process.env.DATABASE_URL ?? '').trim();

  if (url) {
    const partes = new URL(url);
    return {
      url,
      host: partes.hostname,
      puerto: Number(partes.port) || 5432,
      usuario: decodeURIComponent(partes.username),
      clave: decodeURIComponent(partes.password),
      nombre: partes.pathname.replace(/^\//, ''),
      ssl: usaSsl(url),
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    puerto: Number(process.env.DB_PUERTO) || 5432,
    usuario: process.env.DB_USUARIO || 'sistema_juegos',
    clave: process.env.DB_CLAVE || 'sistema_juegos',
    nombre: process.env.DB_NOMBRE || 'sistema_juegos',
    ssl: process.env.DB_SSL === 'true',
  };
}

/**
 * `DB_SSL` manda siempre; si no esta, se respeta el `sslmode` que venga en la
 * URL, que es como Neon entrega la suya.
 */
function usaSsl(url: string): boolean {
  if (process.env.DB_SSL === 'true') return true;
  if (process.env.DB_SSL === 'false') return false;
  return /sslmode=(require|verify-ca|verify-full)/.test(url);
}

/**
 * Lo que entienden TypeORM y el driver pg.
 *
 * `rejectUnauthorized: false` porque los certificados de los hostings
 * compartidos suelen ser autofirmados; el trafico va cifrado igual.
 */
export function opcionesDeConexion(conexion: ConexionBd = leerConexionBd()) {
  const ssl = conexion.ssl ? { rejectUnauthorized: false } : undefined;

  if (conexion.url) return { url: conexion.url, ssl };

  return {
    host: conexion.host,
    port: conexion.puerto,
    username: conexion.usuario,
    password: conexion.clave,
    database: conexion.nombre,
    ssl,
  };
}
