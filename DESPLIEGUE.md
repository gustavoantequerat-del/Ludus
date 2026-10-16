# Desplegar Ludus

Tres piezas:

| Pieza | Que es | Necesita |
|---|---|---|
| Base de datos | PostgreSQL 13+ | que exista antes; el proyecto no la crea |
| Backend | API NestJS (Node 20+) | correr `node`, salida a internet hacia la base, y **disco escribible** si el docente sube imagenes desde la aplicacion |
| Frontend | SPA de Vue, archivos estaticos | cualquier servidor web |

La forma recomendada es **un servidor propio (AWS Lightsail, seccion 2)**: las
tres piezas, o solo backend y frontend con la base en Neon, en una sola
maquina y bajo un solo dominio. Las secciones 3 (cPanel) y 4 (Vercel) quedan
como alternativas, con sus limites.

Antes de nada: `URL_PUBLICA_API` tiene que ser la direccion **publica y por
HTTPS** del backend. Es la que queda grabada dentro de cada paquete SCORM, y
es el error mas facil de cometer (ver seccion 5).

---

## 1. La base de datos

### 1.1 En Neon

1. Crear proyecto en neon.tech y elegir la region **mas cercana al servidor
   del backend** (no a vos): cada consulta cruza esa distancia, y una pantalla
   hace varias.
2. Copiar la **connection string** (Neon la da con `?sslmode=require`).
3. Ponerla tal cual:

```
DATABASE_URL=postgresql://usuario:clave@ep-algo.region.aws.neon.tech/neondb?sslmode=require
```

El `sslmode` de la URL ya activa TLS. Si el backend es serverless, usa el
endpoint **pooled** (`-pooler` en el host): cada invocacion abre su propia
conexion y el plan directo se queda sin cupo enseguida.

**Requisito que no depende del codigo:** el servidor del backend tiene que
poder abrir conexiones salientes al puerto **5432**. En un servidor propio
(Lightsail, cualquier VPS) no hay problema. Muchos hostings compartidos lo
bloquean: se comprueba desde la terminal del servidor con

```bash
timeout 5 bash -c "</dev/tcp/TU-HOST.neon.tech/5432" && echo ABIERTO || echo BLOQUEADO
```

### 1.2 En el mismo servidor

En un servidor propio se puede instalar PostgreSQL al lado del backend
(seccion 2.3). Es lo mas rapido (sin viaje por internet en cada consulta),
pero los respaldos pasan a ser responsabilidad tuya.

```
DB_HOST=localhost
DB_PUERTO=5432
DB_NOMBRE=ludus
DB_USUARIO=ludus
DB_CLAVE=...
```

### 1.3 Elegir entre la local y Neon sin borrar ninguna: `DB_ORIGEN`

Se pueden tener las dos credenciales cargadas en el mismo `.env`. `DB_ORIGEN`
elige cual usar sin tocar ninguna de las dos:

```
DB_ORIGEN=local   # usa DB_HOST/DB_PUERTO/... e ignora DATABASE_URL
DB_ORIGEN=neon    # usa DATABASE_URL e ignora las variables sueltas
```

Vacio (o sin definir): si hay `DATABASE_URL` la usa, si no cae a las
variables sueltas. Un valor invalido, o `DB_ORIGEN=neon` sin `DATABASE_URL`,
hace que el backend no arranque con un mensaje que dice exactamente que
falta, en vez de conectarse a la base equivocada en silencio.

### 1.4 Crear el esquema (igual en todos los casos)

Desde `backend/`, con las variables ya configuradas:

```bash
npm ci
npm run bd:verificar        # confirma que conecta antes de tocar nada
npm run migracion:ejecutar  # crea las tablas y carga los 13 casos base
npm run semilla             # opcional: datos de ejemplo (usuarios de prueba)
```

`npm run semilla` crea usuarios con la clave `ludus123`. **En produccion no lo
corras**, o cambia esas claves apenas entres. Si la base ya tiene datos (la de
Neon que ya usabas), la migracion y la semilla lo detectan y no la tocan.

---

## 2. AWS Lightsail (recomendado)

Una instancia propia (aqui, Lightsail con Debian 12) con **Caddy** como
servidor web: atiende los puertos 80 y 443, saca y renueva solo el certificado
HTTPS, sirve el frontend y pasa la API a Node. Puede compartir la maquina con
otros proyectos: cada uno tiene su bloque en el `Caddyfile` y su propio puerto
de Node.

```
https://ludus.tu-dominio.com
  └── Caddy (80 y 443, certificado automatico)
        ├── /api/*       -> Node en localhost:3000 (PM2 lo mantiene vivo)
        ├── /archivos/*  -> Node (imagenes de los juegos)
        └── todo lo demas -> frontend/dist (la SPA de Vue)
```

Frontend y backend bajo **el mismo dominio**: sin CORS, sin contenido mixto
(HTTP dentro de HTTPS) y con `VITE_URL_API` vacio.

### 2.1 Preparar la instancia

1. **IP estatica**: en Lightsail, *Networking* → *Attach static IP*.
2. **Firewall** (pestana *Networking* de la instancia): `SSH (22)`, `HTTP (80)`
   y `HTTPS (443)` abiertos. **No abras el 3000**: Node solo escucha para Caddy.
3. **DNS**: un registro `A` de `ludus.tu-dominio.com` a la IP estatica (en el
   panel donde administras el dominio, por ejemplo el *Zone Editor* de cPanel).
   Se comprueba con `getent hosts ludus.tu-dominio.com`.
4. Node 20+, PM2 y Caddy instalados. Si la maquina ya tiene otro proyecto con
   Caddy, no hay que instalar nada mas.

### 2.2 Traer el codigo y compilar

```bash
cd ~
git clone https://github.com/USUARIO/ludus.git
cd ludus/backend
npm ci
cp .env.example .env
nano .env          # ver 2.4
npm run build
npm run bd:verificar
npm run migracion:ejecutar
```

```bash
cd ~/ludus/frontend
npm ci
VITE_URL_API= npm run build   # vacio: el frontend llama a /api del mismo dominio
```

Comprueba que el frontend no quedo con una URL escrita a mano (no debe
imprimir nada):

```bash
grep -rhoE "https?://[a-z0-9.-]+/api" ~/ludus/frontend/dist/assets | sort -u
```

### 2.3 (Opcional) PostgreSQL en la misma instancia

Solo si no vas a usar Neon:

```bash
sudo apt-get update && sudo apt-get install -y postgresql
sudo -u postgres psql -c "CREATE USER ludus WITH PASSWORD 'una-clave-larga';"
sudo -u postgres psql -c "CREATE DATABASE ludus OWNER ludus;"
sudo -u postgres psql -d ludus -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
```

Y en el `.env`: `DB_ORIGEN=local`, `DB_HOST=localhost`, `DB_NOMBRE=ludus`,
`DB_USUARIO=ludus`, `DB_CLAVE=una-clave-larga`. Para no perder datos, activa
los *snapshots automaticos* de la instancia en Lightsail.

### 2.4 El `.env` del backend

```
PUERTO=3000
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require   # o las DB_* de 2.3
DB_ORIGEN=neon                                                  # o local
JWT_SECRETO=una-cadena-larga-y-aleatoria
JWT_EXPIRACION=8h
RUTA_ARCHIVOS=
URL_PUBLICA_API=https://ludus.tu-dominio.com/api
GOOGLE_CLIENT_ID=                 # opcional: boton "Continuar con Google" (ver GOOGLE.md)
GOOGLE_ANALYTICS_ID=              # opcional: G-XXXXXXXXXX de Google Analytics 4
```

- `PUERTO`: uno que no use otro proyecto de la maquina (`sudo ss -tlnp` lista
  los ocupados). Si cambias el 3000, cambialo tambien en el `Caddyfile`.
- `JWT_SECRETO`: si ya habia usuarios logueados con otro backend, usa el mismo
  valor para no invalidar sus sesiones. Si no, genera uno con
  `openssl rand -hex 32`.
- `RUTA_ARCHIVOS` **vacio**: usa `backend/archivos`, que es disco persistente.
  Una ruta relativa como `backend/archivos` se resuelve desde la carpeta
  `backend/` y termina creando `backend/backend/archivos`.
- `URL_PUBLICA_API` con `https://` y terminada en `/api`.
- `GOOGLE_CLIENT_ID` y `GOOGLE_ANALYTICS_ID`: vacios, el sitio funciona igual
  (sin boton de Google y sin Analytics). Se leen al arrancar: tras cambiarlos
  basta `pm2 restart ludus-api`, el frontend no se recompila. Como
  crearlos: **GOOGLE.md**.

### 2.5 Mantener Node corriendo con PM2

```bash
cd ~/ludus/backend
pm2 start dist/main.js --name ludus-api
pm2 save
pm2 startup        # imprime un comando con sudo: copialo y ejecutalo (una sola vez por maquina)
```

Comandos utiles: `pm2 logs ludus-api`, `pm2 restart ludus-api --update-env`
(despues de cambiar el `.env`), `pm2 status`.

Comprueba que responde, desde la misma instancia:

```bash
curl -s -X POST http://127.0.0.1:3000/api/autenticacion/ingresar -H "Content-Type: application/json" -d '{"correo":"x@x.io","clave":"xxxxxx"}'
# {"message":"Correo o contrasena invalidos",...}  -> la API y la base funcionan
```

### 2.6 Caddy: el dominio, el certificado, el proxy y el frontend

Agrega el bloque al final de `/etc/caddy/Caddyfile` (con un respaldo antes; los
bloques de otros proyectos no se tocan):

```bash
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak
sudo tee -a /etc/caddy/Caddyfile > /dev/null <<'FIN'

ludus.tu-dominio.com {
    encode gzip
    # Las imagenes viajan en base64 (hasta 6 MB) y el Excel de usuarios pesa hasta 2 MB.
    request_body {
        max_size 12MB
    }

    handle /api/* {
        reverse_proxy localhost:3000
    }
    handle /archivos/* {
        reverse_proxy localhost:3000
    }
    handle {
        root * /home/admin/ludus/frontend/dist
        try_files {path} /index.html
        file_server
    }
}
FIN
```

Caddy corre como el usuario `caddy` y necesita poder leer el frontend:

```bash
chmod o+x /home/admin /home/admin/ludus /home/admin/ludus/frontend
chmod -R o+rX /home/admin/ludus/frontend/dist
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Al recargar, Caddy pide solo el certificado de Let's Encrypt para el dominio
nuevo (unos segundos; el DNS del paso 2.1 tiene que estar apuntando ya). Si
algo falla: `sudo journalctl -u caddy -n 30 --no-pager`.

> Los videos del Runner ya no se suben a Ludus (son links de YouTube o Drive),
> asi que el tope de 12MB sobra para todo; si ya lo tenias asi, no hace falta
> cambiarlo. Los MP4 que hubieran quedado en `backend/archivos/videos/` no los
> usa nada y se pueden borrar.

### 2.7 Actualizar a una version nueva

```bash
cd ~/ludus && git pull
cd backend && npm ci && npm run build && npm run migracion:ejecutar && pm2 restart ludus-api
cd ../frontend && npm ci && VITE_URL_API= npm run build && chmod -R o+rX dist
```

El frontend no necesita reiniciar nada: Caddy sirve los archivos nuevos al
instante (con Ctrl+F5 en el navegador si quedo algo en cache).

`npm ci` hace falta cuando la version nueva trae dependencias nuevas (por
ejemplo `exceljs` y `google-auth-library`); si no, no hace dano.
`migracion:ejecutar` aplica solo las migraciones que falten; las que ya
corrieron no se repiten.

---

## 3. cPanel (alternativa, con limites)

Funciona solo si el hosting cumple **las dos** condiciones:

1. **Corre aplicaciones Node** (*Setup Node.js App* / *Application Manager*, con
   Passenger) y te deja instalar dependencias. Si la terminal no tiene
   `npm`/`node`, hay que compilar `node_modules` y `dist/` en tu computadora y
   subirlos (el proyecto no tiene modulos nativos, asi que es seguro).
2. **Deja salir conexiones al puerto 5432** si la base esta en Neon (ver 1.1).
   En un hosting compartido esto suele estar bloqueado y soporte no siempre lo
   abre; fue lo que hizo pasar este proyecto a un servidor propio.

Si cumple las dos:

1. *Setup Node.js Application* → **Application root**: la carpeta del backend;
   **Application startup file**: `dist/main.js`; Node 20 o superior.
2. Las variables van en *Environment variables* del mismo panel (las de
   `backend/.env.example`). cPanel pasa el puerto en `PORT` y el backend ya lo
   respeta.
3. Frontend: `npm run build` en tu maquina y sube **el contenido** de
   `frontend/dist/` a la carpeta del subdominio. El `.htaccess` incluido
   resuelve las rutas de Vue. Si el backend esta en otro subdominio, compila
   con `VITE_URL_API=https://ese-subdominio/api` — **con https**, o el
   navegador bloquea las llamadas por contenido mixto.

---

## 4. Neon + Vercel (alternativa, sin subida de imagenes)

### 4.1 Backend en Vercel

El repositorio ya trae `backend/vercel.json` y `backend/api/index.js`, que
reexporta el Nest compilado.

1. *New Project* → el repositorio → **Root Directory: `backend`**.
2. Variables: `DATABASE_URL` (endpoint pooled), `JWT_SECRETO`,
   `URL_PUBLICA_API` (la URL del propio despliegue + `/api`) y `RUTA_ARCHIVOS`
   sin valor.
3. Deploy.

**Limitacion real**: en Vercel el disco es de solo lectura. Las imagenes que
estan en `backend/archivos/` se sirven bien, pero subir una imagen **desde la
aplicacion** falla. Los personajes nuevos se agregan dejando el archivo en
`backend/archivos/personajes/` y haciendo commit.

### 4.2 Frontend en Vercel

1. *New Project* → el mismo repositorio → **Root Directory: `frontend`**.
2. Variable `VITE_URL_API=https://tu-backend.vercel.app/api`.
3. Deploy. El `frontend/vercel.json` ya resuelve el enrutado del SPA.

---

## 5. Despues de desplegar: revisar el SCORM

Los paquetes llevan grabada `URL_PUBLICA_API` **del momento en que se
exportaron**. Entra como docente a *Paquetes SCORM*: arriba dice a que
direccion apuntan los paquetes, y avisa en amarillo si esa direccion no va a
funcionar (localhost, una IP de red privada, o HTTP contra un LMS en HTTPS).

Los paquetes exportados antes de un cambio de servidor siguen apuntando a la
direccion vieja: hay que **volver a exportarlos**.

---

## 6. Lista de verificacion

- [ ] `npm run bd:verificar` conecta y dice "Esquema completo", contra la base
      esperada (revisa la linea "base de datos:" que imprime)
- [ ] `JWT_SECRETO` cambiado (no el de ejemplo)
- [ ] `URL_PUBLICA_API` es la URL publica del backend, con HTTPS y `/api`
- [ ] `pm2 status` muestra `ludus-api` en `online`, y sigue asi despues de
      reiniciar la instancia
- [ ] El sitio abre con candado y el login funciona (sin errores de
      "Mixed Content" en la consola del navegador)
- [ ] En Lightsail el puerto 3000 **no** esta abierto en el firewall
- [ ] `request_body` del `Caddyfile` en 12MB
- [ ] Una historia del Runner con un video de YouTube avanza sola, y una con Drive muestra "Continuar"
- [ ] La pantalla *Paquetes SCORM* no muestra la advertencia amarilla
- [ ] Un paquete recien exportado abre y guarda nota desde el LMS
- [ ] Las claves de la semilla cambiadas, o la semilla no ejecutada
- [ ] *Estudiantes > Importar Excel*: la plantilla se descarga y un archivo de
      prueba muestra la vista previa (la subida pasa por el `request_body` de Caddy)
- [ ] La vista *Accesos* muestra tu propio inicio de sesion con tu IP real
      (no 127.0.0.1: si sale esa, Caddy no esta mandando `X-Forwarded-For`)
- [ ] Si configuraste Google: el boton aparece en el login y entra con una
      cuenta que ya existe en Ludus; en Analytics > Tiempo real se ve la visita
