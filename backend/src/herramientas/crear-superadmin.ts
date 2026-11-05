/**
 * Crea un superadministrador, o recupera uno, sin tocar ningun otro dato.
 *
 * Sirve cuando nadie puede entrar como superadmin (por ejemplo, se borro la
 * cuenta antes de que eso estuviera bloqueado). Se corre en el servidor, con
 * el mismo .env del backend, asi que apunta a la misma base:
 *
 *   npm run superadmin:crear -- correo@dominio.com "Nombre Apellido"
 *
 * - Si el correo no existe, crea el usuario como superadmin.
 * - Si ya existe, lo convierte en superadmin, lo reactiva y le pone una clave
 *   nueva (tambien sirve para "olvide mi clave").
 *
 * La clave se genera al azar y se muestra una sola vez: entra con ella y
 * cambiala en "Mi perfil". No se recibe por la linea de comandos para que no
 * quede en el historial de la terminal.
 */
import 'reflect-metadata';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import datosOrigen from '../configuracion/datos-origen';
import { Usuario } from '../usuarios/usuario.entidad';
import { Rol } from '../comun/enums/rol.enum';

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function principal() {
  const [correoCrudo, ...partesNombre] = process.argv.slice(2);
  const correo = (correoCrudo ?? '').trim().toLowerCase();
  const nombre = partesNombre.join(' ').trim();
  if (!PATRON_CORREO.test(correo)) {
    console.error('Uso: npm run superadmin:crear -- correo@dominio.com "Nombre Apellido"');
    process.exit(1);
  }

  await datosOrigen.initialize();
  const usuarios = datosOrigen.getRepository(Usuario);
  // Letras y numeros sin ambiguedades (sin 0/O ni 1/l): facil de copiar.
  const clave = randomBytes(12).toString('base64').replace(/[+/=0O1lI]/g, '').slice(0, 12);
  const claveHash = await bcrypt.hash(clave, 10);

  const existente = await usuarios
    .createQueryBuilder('usuario')
    .where('LOWER(usuario.correo) = :correo', { correo })
    .getOne();

  if (existente) {
    existente.rol = Rol.SUPERADMIN;
    existente.institucionId = null;
    existente.activo = true;
    existente.claveHash = claveHash;
    if (nombre) existente.nombre = nombre;
    await usuarios.save(existente);
    console.log(`\n${existente.nombre} <${existente.correo}> ahora es superadministrador (activo, clave nueva).`);
  } else {
    if (nombre.length < 2) {
      console.error('El correo no existe: indica tambien el nombre, entre comillas.');
      process.exit(1);
    }
    await usuarios.save(
      usuarios.create({ nombre, correo, claveHash, rol: Rol.SUPERADMIN, institucionId: null, activo: true }),
    );
    console.log(`\nSuperadministrador creado: ${nombre} <${correo}>.`);
  }
  console.log(`Clave temporal: ${clave}`);
  console.log('Entra con ella y cambiala en "Mi perfil". No se vuelve a mostrar.\n');
  await datosOrigen.destroy();
}

principal().catch(async (error) => {
  console.error('No se pudo crear el superadministrador:', (error as Error).message);
  if (datosOrigen.isInitialized) await datosOrigen.destroy();
  process.exit(1);
});
