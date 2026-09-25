# Desplegar Ludus

Tres piezas que se despliegan por separado:

| Pieza | Que es | Necesita |
|---|---|---|
| Base de datos | PostgreSQL 13+ | que exista antes; el proyecto no la crea |
| Backend | API NestJS (Node 20+) | correr `node`, y **disco escribible** si el docente sube imagenes desde la aplicacion |
| Frontend | SPA de Vue, archivos estaticos | cualquier servidor web |

Antes de nada: `URL_PUBLICA_API` tiene que ser la direccion **publica y por
HTTPS** del backend. Es la que queda grabada dentro de cada paquete SCORM, y
es el error mas facil de cometer (ver seccion 4).

---

## 1. La base de datos

### 1.1 En cPanel

cPanel trae **PostgreSQL solo en algunos hostings**; muchos ofrecen unicamente
MySQL/MariaDB. Este proyecto usa PostgreSQL (tipos `jsonb`, `uuid_generate_v4`),
asi que ese es el primer chequeo: busca *PostgreSQL Databases* en el panel.

- **Si esta**: crea base y usuario ahi, asignale todos los permisos y anota
  host, puerto, nombre, usuario y clave.
- **Si no esta**: no sirve para este proyecto. Usa Neon (1.2) y deja en cPanel
  solo el backend y el frontend.

Para conectarte desde fuera del servidor (por ejemplo para correr las
migraciones desde tu maquina) hay que habilitar tu IP en *Remote PostgreSQL*.
Muchos hostings compartidos no exponen el puerto 5432 hacia afuera; en ese caso
las migraciones se corren **desde el propio servidor** por SSH o desde la
terminal de cPanel.

```
DB_HOST=localhost          # o el host que indique cPanel
DB_PUERTO=5432
DB_NOMBRE=usuario_ludus    # cPanel antepone el prefijo de tu cuenta
DB_USUARIO=usuario_ludus
DB_CLAVE=...
DB_SSL=true                # solo si la base es remota
```

### 1.2 En Neon

1. Crear proyecto en neon.tech y elegir la region mas cercana.
2. Copiar la **connection string** (Neon la da con `?sslmode=require`).
3. Ponerla tal cual:

```
DATABASE_URL=postgresql://usuario:clave@ep-algo.region.aws.neon.tech/neondb?sslmode=require
```

`DATABASE_URL` tiene prioridad sobre las variables sueltas, y el `sslmode` de
la URL ya activa TLS. Si el backend es serverless, usa el endpoint **pooled**
(`-pooler` en el host): cada invocacion abre su propia conexion y el plan
directo se queda sin cupo enseguida.

### 1.3 Crear el esquema (igual en los dos casos)

Desde `backend/`, con las variables ya configuradas:

```bash
npm install
npm run bd:verificar        # confirma que conecta antes de tocar nada
npm run migracion:ejecutar  # crea las tablas y carga los 13 casos base
npm run semilla             # opcional: datos de ejemplo (usuarios de prueba)
```

`npm run semilla` crea usuarios con la clave `ludus123`. **En produccion no lo
corras**, o cambia esas claves apenas entres.

---

## 2. Todo en cPanel

Es la opcion mas simple si tu hosting tiene PostgreSQL y Node.

### 2.1 Backend (Setup Node.js App)

1. Subir el repositorio (Git Version Control o subiendo el ZIP).
2. *Setup Node.js Application* → **Application root**: la carpeta `backend`;
   **Application startup file**: `dist/main.js`; version de Node 20 o superior.
3. *Run NPM Install*, y en la terminal de la aplicacion: `npm run build`.
4. Cargar las variables de entorno en la seccion *Environment variables* del
   mismo panel (las de `backend/.env.example`). No subas el `.env`.
5. `URL_PUBLICA_API=https://tu-dominio.com/api` (o el subdominio que uses).
6. Reiniciar la aplicacion.

cPanel pasa el puerto en `PORT` y el backend ya lo respeta.

**Ventaja frente a Vercel**: el disco es persistente, asi que subir imagenes de
personajes desde la aplicacion funciona. Conviene poner `RUTA_ARCHIVOS` fuera
de la carpeta del repositorio (por ejemplo `/home/usuario/ludus-archivos`) para
que un `git pull` no la toque.

### 2.1.1 Si tu cPanel no tiene `npm`/`node` en la terminal

Pasa en algunos hostings compartidos: la interfaz de *Setup Node.js App*
existe, pero el jailshell no expone `node`/`npm` (o "Ensure dependencies"
falla). La salida es construir `node_modules` y `dist/` en tu computadora y
subirlos tal cual:

```bash
cd backend
npm install
npm run build
```

Sube `node_modules/`, `dist/`, `package.json` y `archivos/` (todo menos
`.env`) a la carpeta de la aplicacion. **Esto funciona sin arriesgarse a
incompatibilidades de plataforma**: el proyecto no tiene ningun modulo nativo
compilado (nada de C++, nada que dependa del sistema operativo donde se
instalo) — se puede verificar con `find node_modules -name "*.node"`, que da
vacio. Si en algun momento se agrega una dependencia que si lo tenga, dejaria
de ser seguro subir `node_modules` armado en otra maquina.

Las migraciones y la semilla tambien necesitan `node`: si no lo tenes en el
servidor, correlas **desde tu propia computadora**, apuntando a la misma
`DATABASE_URL` de Neon (es una base en internet, no hace falta estar en el
servidor para llegar a ella):

```bash
cd backend
echo "DATABASE_URL=postgresql://...  (la misma que pusiste en cPanel)" > .env
echo "DB_SSL=true" >> .env
npm run bd:verificar
npm run migracion:ejecutar
npm run semilla   # opcional
```

Lo unico que tiene que correr en el servidor es la app ya compilada
(`dist/main.js`), y de eso se encarga Passenger a traves de la interfaz de
cPanel, sin que vos necesites `npm` ahi.

### 2.2 Frontend

1. En tu maquina: `cd frontend && npm install && npm run build`.
   Si el backend esta en otro dominio, primero `VITE_URL_API=https://.../api`.
2. Subir **el contenido** de `frontend/dist/` a `public_html` (o a la carpeta
   del subdominio).
3. El `.htaccess` ya va incluido en el build: hace que las rutas de Vue
   (`/editor`, `/cursos/...`) devuelvan `index.html` en vez de 404.

Si backend y frontend comparten dominio (el backend bajo `/api`), deja
`VITE_URL_API` vacio y todo funciona con rutas relativas.

---

## 3. Neon + Vercel

### 3.1 Backend en Vercel

El repositorio ya trae lo necesario: `backend/vercel.json` y
`backend/api/index.js`, que reexporta el Nest compilado (`nest build` primero,
porque el compilador de Vercel no emite los metadatos de decoradores que Nest
necesita).

1. *New Project* → el repositorio → **Root Directory: `backend`**.
2. Variables de entorno: `DATABASE_URL`, `JWT_SECRETO`, `URL_PUBLICA_API`
   (la URL del propio despliegue + `/api`) y `RUTA_ARCHIVOS` sin valor.
3. Deploy.

**Limitacion real, no un detalle**: en Vercel el disco es de solo lectura.

- Las imagenes **versionadas** en `backend/archivos/` se despliegan y se
  sirven bien (el `includeFiles` del `vercel.json` las incluye).
- Subir una imagen **desde la aplicacion** falla, y si funcionara se perderia
  en el siguiente despliegue.

Es decir: en Vercel, los personajes se agregan **dejando el archivo en
`backend/archivos/personajes/` y haciendo commit**, no con el boton de subir.
Si necesitas la subida desde la aplicacion, usa cPanel, o un host con disco
persistente (Render, Railway, Fly), o cambia el almacenamiento a S3/R2.

### 3.2 Frontend en Vercel

1. *New Project* → el mismo repositorio → **Root Directory: `frontend`**.
2. Variable `VITE_URL_API=https://tu-backend.vercel.app/api`.
3. Deploy. El `frontend/vercel.json` ya resuelve el enrutado del SPA.

---

## 4. Despues de desplegar: revisar el SCORM

Los paquetes llevan grabada `URL_PUBLICA_API` **del momento en que se
exportaron**. Entra como docente a *Paquetes SCORM*: arriba dice a que
direccion apuntan los paquetes, y avisa en amarillo si esa direccion no va a
funcionar (localhost, una IP de red privada, o HTTP contra un LMS en HTTPS).

Los paquetes exportados antes del despliegue siguen apuntando a la direccion
vieja: hay que **volver a exportarlos**.

---

## 5. Lista de verificacion

- [ ] `npm run bd:verificar` conecta y dice "Esquema completo"
- [ ] `JWT_SECRETO` cambiado (no el de ejemplo)
- [ ] `URL_PUBLICA_API` es la URL publica del backend, con HTTPS
- [ ] Si el frontend esta en otro dominio, `VITE_URL_API` apunta al backend
- [ ] La pantalla *Paquetes SCORM* no muestra la advertencia amarilla
- [ ] Un paquete recien exportado abre y guarda nota desde el LMS
- [ ] Las claves de la semilla cambiadas, o la semilla no ejecutada
