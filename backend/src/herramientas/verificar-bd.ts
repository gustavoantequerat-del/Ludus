/**
 * Diagnostico de la conexion a PostgreSQL.
 *
 * Responde tres preguntas en orden: se llega al servidor, se puede entrar con
 * las credenciales, y la base esta lista para usarse (migraciones y datos).
 * Cada fallo explica que hacer, en vez de dejar el error crudo del driver.
 *
 * Usa el mismo DataSource que las migraciones y la aplicacion, asi que lo que
 * verifica es exactamente la configuracion que usa el backend al arrancar.
 *
 * Uso: npm run bd:verificar
 */
import { existsSync } from 'fs';
import { join } from 'path';
import datosOrigen from '../configuracion/datos-origen';

const RUTA_ENV = join(__dirname, '../../.env');

const opciones = datosOrigen.options as {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
};

const TABLAS_ESPERADAS = [
  'instituciones',
  'usuarios',
  'cursos',
  'modulos_curso',
  'rutas',
  'juegos',
  'inscripciones',
  'solicitudes',
  'resultados',
  'paquetes_scorm',
  'personajes',
  'casos_cumplimiento',
];

function titulo(texto: string) {
  console.log(`\n${texto}`);
}

function ok(texto: string) {
  console.log(`  [OK]    ${texto}`);
}

function aviso(texto: string) {
  console.log(`  [AVISO] ${texto}`);
}

function error(texto: string) {
  console.log(`  [ERROR] ${texto}`);
}

function comoArreglar(pasos: string[]) {
  console.log('\n  Como arreglarlo:');
  pasos.forEach((paso) => console.log(`    ${paso}`));
}

function mostrarConfiguracion() {
  titulo('Configuracion que se esta usando');
  console.log(`  host:    ${opciones.host}`);
  console.log(`  puerto:  ${opciones.port}`);
  console.log(`  base:    ${opciones.database}`);
  console.log(`  usuario: ${opciones.username}`);
  console.log(`  clave:   ${opciones.password ? '(definida)' : '(vacia)'}`);

  if (existsSync(RUTA_ENV)) {
    console.log('  origen:  backend/.env');
    return;
  }

  console.log('  origen:  valores por defecto (no existe backend/.env)');
  aviso('No hay archivo .env; se estan usando los valores por defecto.');
  comoArreglar([
    'cp .env.example .env',
    'y ajusta las credenciales si tu PostgreSQL usa otras.',
  ]);
}

/** Traduce el error del driver a una causa concreta y su remedio. */
function explicarFallo(fallo: Error & { code?: string }) {
  const codigo = fallo.code ?? '';

  if (codigo === 'ECONNREFUSED') {
    error(`No hay nadie escuchando en ${opciones.host}:${opciones.port}.`);
    comoArreglar([
      'Verifica que PostgreSQL este corriendo:',
      '  Linux:   sudo service postgresql start',
      '  macOS:   brew services start postgresql',
      '  Windows: inicia el servicio PostgreSQL desde Servicios',
      'Si corre en otro puerto, ajusta DB_PUERTO en backend/.env',
    ]);
    return;
  }

  if (codigo === 'ENOTFOUND' || codigo === 'EAI_AGAIN') {
    error(`No se pudo resolver el host "${opciones.host}".`);
    comoArreglar(['Revisa DB_HOST en backend/.env']);
    return;
  }

  if (codigo === 'ETIMEDOUT') {
    error(`Tiempo de espera agotado contra ${opciones.host}:${opciones.port}.`);
    comoArreglar([
      'Suele ser un firewall o una base remota inalcanzable.',
      'Verifica que el puerto este abierto desde esta maquina.',
    ]);
    return;
  }

  if (codigo === '28P01' || codigo === '28000') {
    error(`El usuario "${opciones.username}" no pudo autenticarse.`);
    comoArreglar([
      'Revisa DB_USUARIO y DB_CLAVE en backend/.env, o crea el usuario:',
      `  sudo -u postgres psql -c "CREATE USER ${opciones.username} WITH PASSWORD '${opciones.password}';"`,
    ]);
    return;
  }

  if (codigo === '3D000') {
    error(`El servidor responde, pero la base "${opciones.database}" no existe.`);
    comoArreglar([
      'Creala con:',
      `  sudo -u postgres psql -c "CREATE DATABASE ${opciones.database} OWNER ${opciones.username};"`,
      'y despues ejecuta: npm run migracion:ejecutar && npm run semilla',
    ]);
    return;
  }

  error(`${fallo.message}${codigo ? ` (codigo ${codigo})` : ''}`);
}

async function revisarEsquema() {
  titulo('Estado de la base');

  const tablas: { table_name: string }[] = await datosOrigen.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  const presentes = tablas.map((fila) => fila.table_name);
  const faltantes = TABLAS_ESPERADAS.filter((tabla) => !presentes.includes(tabla));

  if (presentes.length === 0) {
    aviso('La base existe pero esta vacia: no hay tablas.');
    comoArreglar(['npm run migracion:ejecutar', 'npm run semilla']);
    return;
  }

  if (faltantes.length > 0) {
    aviso(`Faltan tablas: ${faltantes.join(', ')}`);
    comoArreglar(['npm run migracion:ejecutar']);
  } else {
    ok(`Esquema completo (${presentes.length} tablas).`);
  }

  if (presentes.includes('migrations')) {
    const migraciones: { name: string }[] = await datosOrigen.query(
      'SELECT name FROM migrations ORDER BY timestamp',
    );
    ok(`Migraciones aplicadas: ${migraciones.length}`);
    migraciones.forEach((fila) => console.log(`            - ${fila.name}`));
  }

  if (faltantes.length > 0) {
    return;
  }

  const conteos: { usuarios: string; juegos: string }[] = await datosOrigen.query(
    'SELECT (SELECT COUNT(*) FROM usuarios) AS usuarios, (SELECT COUNT(*) FROM juegos) AS juegos',
  );
  const { usuarios, juegos } = conteos[0];
  if (Number(usuarios) === 0) {
    aviso('No hay usuarios cargados: todavia no vas a poder iniciar sesion.');
    comoArreglar(['npm run semilla']);
  } else {
    ok(`Datos cargados: ${usuarios} usuarios, ${juegos} juegos en el catalogo.`);
  }
}

async function verificar() {
  console.log('Verificando la conexion a PostgreSQL...');
  mostrarConfiguracion();

  titulo('Conexion');
  try {
    await datosOrigen.initialize();
  } catch (fallo) {
    explicarFallo(fallo as Error & { code?: string });
    console.log('');
    process.exit(1);
  }

  try {
    const version: { server_version: string }[] = await datosOrigen.query('SHOW server_version');
    ok(`Conectado a PostgreSQL ${version[0].server_version}`);
    await revisarEsquema();
  } finally {
    await datosOrigen.destroy();
  }

  console.log('');
}

verificar().catch((fallo) => {
  console.error('\n  [ERROR] Fallo inesperado:', (fallo as Error).message, '\n');
  process.exit(1);
});
