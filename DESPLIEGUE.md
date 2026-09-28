# Desplegar Ludus

Tres piezas que se despliegan por separado:

| Pieza | Que es | Necesita |
|---|---|---|
| Base de datos | PostgreSQL | que exista antes; el proyecto no la crea |
| Backend | API en Laravel (PHP 8.2+) | un hosting con PHP: cPanel sirve tal cual, sin Node |
| Frontend | SPA de Vue, archivos estaticos | cualquier servidor web |

Antes de nada: `URL_PUBLICA_API` tiene que ser la direccion **publica y por
HTTPS** del backend. Es la que queda grabada dentro de cada paquete SCORM, y
es el error mas facil de cometer (ver seccion 4).

---

## 1. La base de datos

### 1.1 En cPanel

cPanel trae **PostgreSQL solo en algunos hostings**; muchos ofrecen unicamente
MySQL/MariaDB. Este proyecto usa PostgreSQL (tipos `jsonb`, `uuid`), asi que
ese es el primer chequeo: busca *PostgreSQL Databases* en el panel.

- **Si esta**: crea base y usuario ahi, asignale todos los permisos y anota
  host, puerto, nombre, usuario y clave.
- **Si no esta**: usa Neon (1.2) y deja en cPanel solo el backend y el
  frontend.

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
3. Ponerla tal cual en el `.env` del backend:

```
DATABASE_URL=postgresql://usuario:clave@ep-algo.region.aws.neon.tech/neondb?sslmode=require
```

Si `DATABASE_URL` es la unica de las dos que esta definida, se usa sola. El
`sslmode` de la URL ya activa TLS.

Dos cosas que el backend resuelve solo, pero conviene saber:

- **libpq vieja.** Neon reconoce a que base ir por el nombre del host (SNI).
  Muchos cPanel traen una libpq vieja que no lo envia, y Neon rechaza la
  conexion con *"Endpoint ID is not specified"*. El backend lo detecta y
  reintenta pasando el endpoint, que es la salida que documenta Neon.
- **Puerto 5432 saliente.** El backend se conecta a Neon desde el servidor
  del hosting. Algunos hostings compartidos bloquean las conexiones salientes
  al puerto 5432; si `bd:verificar` da *timeout*, pedile al soporte del
  hosting que habilite la salida al 5432 (es un pedido comun).

### 1.3 Elegir entre la local y Neon sin borrar ninguna: `DB_ORIGEN`

En desarrollo es comun tener las dos credenciales cargadas en el mismo
`.env`: un Postgres local para trabajar rapido, y la `DATABASE_URL` de Neon a
mano para probar contra la base real de vez en cuando. `DB_ORIGEN` elige cual
usar sin tocar ninguna de las dos:

```
DB_ORIGEN=local   # usa DB_HOST/DB_PUERTO/... e ignora DATABASE_URL
DB_ORIGEN=neon    # usa DATABASE_URL e ignora las variables sueltas
```

Vacio (o sin definir): si hay `DATABASE_URL` la usa, si no cae a las variables
sueltas. Un despliegue que solo configura una de las dos no necesita tocar
`DB_ORIGEN`. Un valor invalido, o `DB_ORIGEN=neon` sin `DATABASE_URL`, hace
que el backend no arranque con un mensaje que dice exactamente que falta, en
vez de conectarse a la base equivocada en silencio.

### 1.4 Crear el esquema

Desde la carpeta del backend, con el `.env` ya configurado:

```bash
php artisan bd:verificar      # confirma que conecta antes de tocar nada
php artisan migrate --force   # crea las tablas y carga los 13 casos base
php artisan semilla           # opcional: datos de ejemplo (usuarios de prueba)
```

**Si la base ya la uso el backend anterior (NestJS)** —la de Neon, por
ejemplo— no hace falta hacer nada: tiene el mismo esquema. `migrate` la
detecta, no cambia nada y solo anota que las migraciones ya estan.

`php artisan semilla` crea usuarios con la clave `ludus123` y solo corre sobre
una base vacia. **En produccion no lo corras**, o cambia esas claves apenas
entres.

Estos comandos se pueden correr desde la terminal de cPanel o desde tu
computadora apuntando a la misma `DATABASE_URL` (Neon esta en internet, no
hace falta estar en el servidor para llegar a ella).

---

## 2. Backend en cPanel

El backend es PHP: cPanel lo sirve con Apache como cualquier sitio, **sin**
*Setup Node.js App* ni *Application Manager*, y sin `npm`.

### 2.1 PHP del dominio

1. **MultiPHP Manager** → marca el dominio (o subdominio) de la API → PHP
   **8.2 o superior**.
2. **Select PHP Version → Extensions** (en hostings con CloudLinux), o
   **MultiPHP INI / EasyApache** segun el panel. Tienen que estar activas:
   `pdo_pgsql`, `pgsql`, `zip`, `mbstring`, `openssl`, `fileinfo`,
   `tokenizer`, `ctype`. Las dos que suelen faltar son `pdo_pgsql` (sin ella
   no hay base de datos) y `zip` (sin ella no se exportan paquetes SCORM).

### 2.2 Subir el codigo

El backend necesita la carpeta `vendor/` (las librerias de Laravel). No esta
en el repositorio; hay dos formas de conseguirla:

**A. Con la terminal de cPanel** (si `php -v` responde ahi):

```bash
cd ~/ludus-backend            # la carpeta donde subiste backend/
composer install --no-dev --optimize-autoloader
```

Si no hay `composer`, se baja en la misma carpeta y se usa igual:

```bash
curl -sS https://getcomposer.org/installer | php
php composer.phar install --no-dev --optimize-autoloader
```

**B. Sin terminal**: en tu computadora, dentro de `backend/`, corre
`composer install --no-dev --optimize-autoloader`, comprime la carpeta
**con** `vendor/` y **sin** `.env`, y subi ese ZIP con el *Administrador de
archivos* de cPanel (despues *Extraer*). `vendor/` es PHP puro, sin nada
compilado, asi que armado en otra maquina funciona igual.

Conviene que la carpeta del backend quede **fuera** de `public_html`, por
ejemplo `/home/USUARIO/ludus-backend`.

### 2.3 El dominio apunta a `public/`

**Dominios** → el subdominio de la API → **Raiz del documento** (Document
Root) → `ludus-backend/public`.

Si el panel no deja cambiarla, apunta el dominio a `ludus-backend` a secas:
el `.htaccess` que trae esa carpeta manda todo a `public/`, asi que el `.env` y
el resto del proyecto nunca quedan expuestos.

### 2.4 El `.env`

cPanel no tiene un panel de variables de entorno para PHP: van en el archivo
`.env`, en la carpeta del backend. Copia `.env.example` como `.env` (en el
*Administrador de archivos*, activa "Mostrar archivos ocultos") y completa:

```
DATABASE_URL=postgresql://...            # la de Neon, completa
JWT_SECRETO=una-frase-larga-y-secreta    # la misma que antes, si ya habia usuarios con sesion
JWT_EXPIRACION=8h
URL_PUBLICA_API=https://api.tu-dominio.com/api
RUTA_ARCHIVOS=
APP_DEBUG=false
```

- `URL_PUBLICA_API` va **con `https://` y terminada en `/api`**.
- `RUTA_ARCHIVOS` **vacio**: las imagenes quedan en `public/archivos`, que
  Apache sirve directo. Si lo cambias, tiene que ser una ruta completa de
  disco donde PHP pueda escribir (`/home/USUARIO/ludus-archivos`), no `/archivos`.
- `DB_SSL` no hace falta con Neon: el `sslmode=require` de la URL ya lo activa.

### 2.5 Si antes estaba la version en Node

Si en ese dominio habia una aplicacion Node (en *Application Manager* o en
*Setup Node.js App*), **eliminala o desactivala**: mientras exista, Passenger
sigue respondiendo en ese dominio en lugar de PHP. Despues revisa que el
`.htaccess` de la carpeta del dominio no haya quedado con lineas
`Passenger...` o `CLOUDLINUX PASSENGER CONFIGURATION`.

### 2.6 Comprobar que funciona

1. Abre `https://api.tu-dominio.com/api/juegos` en el navegador. Tiene que
   responder `{"message":"Unauthorized","statusCode":401}`: eso es la API
   funcionando (pide sesion). Si ves una pagina de Apache o un 404 en HTML,
   la raiz del documento no apunta a `public/` (2.3).
2. En la terminal de cPanel: `php artisan bd:verificar`. Dice que base usa,
   si PHP tiene las extensiones y si el esquema esta completo.

Si `php -v` en la terminal muestra una version menor a 8.2 (la terminal puede
usar otro PHP que el sitio), llamalo con la ruta completa:
`/opt/cpanel/ea-php82/root/usr/bin/php artisan bd:verificar`, o en CloudLinux
`/opt/alt/php82/usr/bin/php artisan bd:verificar`.

### 2.7 Permisos y actualizaciones

- PHP tiene que poder escribir en `storage/`, `bootstrap/cache/` y
  `public/archivos/personajes/` (ahi se guardan las fotos que sube el
  docente). Con los permisos por defecto de cPanel (carpetas 755) ya funciona.
- Para actualizar, sube los archivos nuevos **sin** pisar `.env` ni
  `public/archivos/personajes/` (ahi estan las imagenes subidas desde la
  aplicacion).

---

## 3. Frontend

### 3.1 En cPanel

1. En tu maquina: `cd frontend && npm install && npm run build`, con
   `VITE_URL_API=https://api.tu-dominio.com/api` en `frontend/.env` si el
   backend esta en otro dominio.
2. Subir **el contenido** de `frontend/dist/` a la carpeta del dominio del
   frontend (o a `public_html`).
3. El `.htaccess` ya va incluido en el build: hace que las rutas de Vue
   (`/editor`, `/cursos/...`) devuelvan `index.html` en vez de 404.

Si backend y frontend comparten dominio (el backend bajo `/api`), deja
`VITE_URL_API` vacio y todo funciona con rutas relativas.

### 3.2 En Vercel

1. *New Project* → el repositorio → **Root Directory: `frontend`**.
2. Variable `VITE_URL_API=https://api.tu-dominio.com/api`.
3. Deploy. El `frontend/vercel.json` ya resuelve el enrutado del SPA.

El backend ya no se despliega en Vercel: es PHP, y Vercel no lo corre sin
runtimes de la comunidad. Cualquier hosting con PHP 8.2 sirve (cPanel,
Render, Railway, un VPS); ademas, a diferencia de Vercel, tienen disco
persistente, asi que subir imagenes desde la aplicacion funciona.

---

## 4. Despues de desplegar: revisar el SCORM

Los paquetes llevan grabada `URL_PUBLICA_API` **del momento en que se
exportaron**. Entra como docente a *Paquetes SCORM*: arriba dice a que
direccion apuntan los paquetes, y avisa en amarillo si esa direccion no va a
funcionar (localhost, una IP de red privada, o HTTP contra un LMS en HTTPS).

Los paquetes exportados antes del despliegue siguen apuntando a la direccion
vieja: hay que **volver a exportarlos**. (Los que ya apuntaban a la URL
correcta siguen andando: el backend en Laravel responde las mismas rutas.)

---

## 5. Problemas comunes

| Sintoma | Causa probable | Que hacer |
|---|---|---|
| Error 500 sin detalle | cualquier error del servidor | pon `APP_DEBUG=true` un momento y recarga, o mira `storage/logs/laravel.log`; despues vuelve a `false` |
| `could not find driver` | falta `pdo_pgsql` | 2.1, activar la extension |
| `bd:verificar` da *timeout* contra Neon | el hosting bloquea el 5432 saliente | pedir al soporte que lo habilite (1.2) |
| 404 en HTML en `/api/...` | la raiz del documento no es `public/`, o falta `mod_rewrite` | 2.3 |
| Sigue respondiendo la version en Node | la app de Node sigue registrada | 2.5 |
| Las imagenes del juego dan 404 | `RUTA_ARCHIVOS` mal puesta | dejarla vacia (2.4) |
| "Solo se aceptan..." al subir un CEO | formato no soportado | PNG, JPG o WEBP de hasta 3 MB |
| No se descarga el paquete SCORM | falta la extension `zip` | 2.1 |

---

## 6. Lista de verificacion

- [ ] PHP 8.2+ en el dominio de la API, con `pdo_pgsql` y `zip`
- [ ] La raiz del documento de la API apunta a `public/`
- [ ] Ninguna aplicacion Node registrada en ese dominio
- [ ] `https://api.../api/juegos` responde `{"message":"Unauthorized","statusCode":401}`
- [ ] `php artisan bd:verificar` conecta y dice "Esquema completo", contra la
      base esperada (revisa la linea "base de datos:" que imprime)
- [ ] `JWT_SECRETO` cambiado (no el de ejemplo) y `APP_DEBUG=false`
- [ ] `URL_PUBLICA_API` es la URL publica del backend, con HTTPS
- [ ] Si el frontend esta en otro dominio, `VITE_URL_API` apunta al backend
- [ ] La pantalla *Paquetes SCORM* no muestra la advertencia amarilla
- [ ] Un paquete recien exportado abre y guarda nota desde el LMS
- [ ] Las claves de la semilla cambiadas, o la semilla no ejecutada
