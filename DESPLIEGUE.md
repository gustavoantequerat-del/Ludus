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

Una instancia de Lightsail con la imagen **Node.js** trae Node, npm y Apache
(es la imagen de Bitnami). El plan de 2 GB de RAM y 2 vCPU alcanza de sobra
para backend, frontend y, si se quiere, PostgreSQL en la misma maquina.

Como queda armado:

```
https://ludus.tu-dominio.com
  └── Apache (puertos 80 y 443, con el certificado)
        ├── /api/*       -> proxy a Node en 127.0.0.1:3000 (PM2 lo mantiene vivo)
        ├── /archivos/*  -> proxy a Node (imagenes de personajes y fondos)
        └── todo lo demas -> frontend/dist (la SPA de Vue)
```

Frontend y backend bajo **el mismo dominio**: sin CORS, sin contenido mixto
(HTTP dentro de HTTPS) y con `VITE_URL_API` vacio.

### 2.1 Preparar la instancia

1. **IP estatica**: en Lightsail, *Networking* → *Attach static IP* (la de la
   instancia cambia en cada reinicio si no se fija).
2. **Firewall**: en la pestana *Networking* de la instancia, deja abiertos
   `SSH (22)`, `HTTP (80)` y agrega `HTTPS (443)`. **No abras el 3000**: Node
   solo escucha para Apache.
3. **DNS**: en el panel donde administras el dominio (por ejemplo el *Zone
   Editor* de cPanel), crea un registro `A` de `ludus.tu-dominio.com` a la IP
   estatica. Tarda de minutos a un par de horas en propagarse; se comprueba con
   `ping ludus.tu-dominio.com`.
4. Entra por SSH (el boton *Connect using SSH* de Lightsail). El usuario es
   `bitnami`.

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
npm run build      # con VITE_URL_API vacio: el frontend llama a /api del mismo dominio
```

### 2.3 (Opcional) PostgreSQL en la misma instancia

Solo si no vas a usar Neon:

```bash
sudo apt-get update && sudo apt-get install -y postgresql
sudo -u postgres psql -c "CREATE USER ludus WITH PASSWORD 'una-clave-larga';"
sudo -u postgres psql -c "CREATE DATABASE ludus OWNER ludus;"
```

Y en el `.env`: `DB_ORIGEN=local`, `DB_HOST=localhost`, `DB_NOMBRE=ludus`,
`DB_USUARIO=ludus`, `DB_CLAVE=una-clave-larga`. PostgreSQL queda escuchando
solo en la propia maquina, que es lo correcto. Para no perder datos, activa
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
```

- `JWT_SECRETO`: si ya habia usuarios logueados con otro backend, usa el mismo
  valor para no invalidar sus sesiones. Si no, genera uno con
  `openssl rand -hex 32`.
- `RUTA_ARCHIVOS` **vacio**: usa `backend/archivos`, que en Lightsail es disco
  persistente. Una ruta relativa como `backend/archivos` se resuelve desde la
  carpeta `backend/` y termina creando `backend/backend/archivos`.
- `URL_PUBLICA_API` con `https://` y terminada en `/api`.

### 2.5 Mantener Node corriendo con PM2

```bash
sudo npm install -g pm2
cd ~/ludus/backend
pm2 start dist/main.js --name ludus-api
pm2 save
pm2 startup        # imprime un comando con sudo: copialo y ejecutalo
```

`pm2 startup` hace que la API vuelva sola despues de un reinicio de la
instancia. Comandos utiles: `pm2 logs ludus-api`, `pm2 restart ludus-api`,
`pm2 status`.

Comprueba que responde, desde la misma instancia:

```bash
curl -s -X POST http://127.0.0.1:3000/api/autenticacion/ingresar \
  -H "Content-Type: application/json" -d '{"correo":"x@x.io","clave":"x"}'
# {"message":"Correo o contrasena invalidos",...}  -> la API y la base funcionan
```

### 2.6 Apache: el dominio, el proxy y el frontend

Crea `/opt/bitnami/apache/conf/vhosts/ludus-vhost.conf` (con
`sudo nano ...`), cambiando el dominio:

```apache
<VirtualHost 127.0.0.1:80 _default_:80>
  ServerName ludus.tu-dominio.com
  Include /opt/bitnami/apache/conf/vhosts/ludus-comun.conf.inc
</VirtualHost>

<VirtualHost 127.0.0.1:443 _default_:443>
  ServerName ludus.tu-dominio.com
  SSLEngine on
  SSLCertificateFile "/opt/bitnami/apache/conf/bitnami/certs/server.crt"
  SSLCertificateKeyFile "/opt/bitnami/apache/conf/bitnami/certs/server.key"
  Include /opt/bitnami/apache/conf/vhosts/ludus-comun.conf.inc
</VirtualHost>
```

Y `/opt/bitnami/apache/conf/vhosts/ludus-comun.conf.inc`:

```apache
DocumentRoot "/home/bitnami/ludus/frontend/dist"
<Directory "/home/bitnami/ludus/frontend/dist">
  Require all granted
  # Las rutas de Vue (/editor, /cursos/...) devuelven index.html en vez de 404.
  FallbackResource /index.html
</Directory>

ProxyPreserveHost On
ProxyPass        /api      http://127.0.0.1:3000/api
ProxyPassReverse /api      http://127.0.0.1:3000/api
ProxyPass        /archivos http://127.0.0.1:3000/archivos
ProxyPassReverse /archivos http://127.0.0.1:3000/archivos

# Las imagenes de personajes viajan en base64 (hasta 6 MB).
LimitRequestBody 7340032
```

Apache corre como otro usuario y necesita poder leer el frontend:

```bash
chmod o+x /home/bitnami /home/bitnami/ludus /home/bitnami/ludus/frontend
sudo /opt/bitnami/ctlscript.sh restart apache
```

Con eso `http://ludus.tu-dominio.com` ya debe mostrar el login (todavia sin
candado).

### 2.7 HTTPS

La imagen de Bitnami trae una herramienta que pide el certificado gratuito de
Let's Encrypt, lo instala y lo renueva sola:

```bash
sudo /opt/bitnami/bncert-tool
```

Te pide el dominio (`ludus.tu-dominio.com`; responde que no a agregar el
`www` si no creaste ese registro), si quieres redirigir HTTP a HTTPS (si) y un
correo. El DNS del paso 2.1 tiene que estar ya apuntando a la instancia o la
validacion falla.

### 2.8 Actualizar a una version nueva

```bash
cd ~/ludus && git pull
cd backend && npm ci && npm run build && npm run migracion:ejecutar && pm2 restart ludus-api
cd ../frontend && npm ci && npm run build
```

El frontend no necesita reiniciar nada: Apache sirve los archivos nuevos al
instante (con Ctrl+F5 en el navegador si quedo algo en cache).

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
- [ ] La pantalla *Paquetes SCORM* no muestra la advertencia amarilla
- [ ] Un paquete recien exportado abre y guarda nota desde el LMS
- [ ] Las claves de la semilla cambiadas, o la semilla no ejecutada
