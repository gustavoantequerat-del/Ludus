# Google en Ludus: inicio de sesion y Analytics

Las dos integraciones ya estan programadas y son **opcionales**: se activan
poniendo un valor en el `.env` del backend y reiniciando. No hace falta
recompilar el frontend, porque lo pide al backend al arrancar
(`GET /api/autenticacion/opciones`).

| Variable (backend/.env) | Que activa | Si queda vacia |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Boton "Continuar con Google" en el login | No aparece el boton |
| `GOOGLE_ANALYTICS_ID` | Google Analytics 4 en todo el sitio | No se carga Analytics |

Despues de cambiar cualquiera de las dos, en el servidor:

```bash
cd ~/ludus/backend && pm2 restart ludus-api
```

En los ejemplos, el dominio es `https://ludus.nexum-onchain.com`; cambialo si
usas otro.

---

## 1. Que guarda cada cosa (y que no)

Antes de configurar conviene saber donde va a estar cada dato:

| Pregunta | Donde se ve |
|---|---|
| **Que cuenta entro y cuando** (nombre, correo, IP, por donde) | Ludus, vista **Accesos** (superadmin: todo; admin: su institucion) |
| Cuantas visitas hubo, que pantallas se usan, desde que pais o dispositivo | Google Analytics |
| Que hizo una cuenta concreta en el sitio (su recorrido) | Google Analytics, por su `user_id`, que es el id de Ludus |

Google Analytics **prohibe** en sus condiciones recibir datos que identifiquen
a una persona (correo, nombre, telefono). Por eso Ludus solo le manda:

- `user_id`: el id interno de la cuenta en Ludus (un uuid, no dice quien es);
- propiedades `rol` e `institucion_id`;
- una vista por cada pantalla (con el nombre de la pantalla, por ejemplo
  `curso-detalle`) y el evento `login` con el metodo (`clave` o `google`).

Si en Analytics ves un `user_id` y quieres saber de quien es, buscalo en
Ludus: la vista **Accesos** y la de **Usuarios** muestran a la persona; el id
es el mismo.

---

## 2. Inicio de sesion con Google

### Como funciona

- El boton lo dibuja Google (Google Identity Services). Al elegir la cuenta,
  Google entrega una credencial firmada y el backend la verifica con la
  libreria oficial `google-auth-library` contra tu `GOOGLE_CLIENT_ID`.
- **No crea cuentas.** Entra solo quien ya existe en Ludus y esta activo, con
  el mismo correo (sin importar mayusculas). Al resto le aparece "No hay una
  cuenta activa de Ludus para ...". Las cuentas se siguen creando a mano o con
  **Importar Excel**.
- La contrasena de Ludus sigue funcionando; Google es una forma mas de entrar.
- Dentro de un paquete SCORM se sigue entrando con correo y contrasena de
  Ludus (Google no permite su boton dentro del iframe de un LMS de terceros
  sin registrar cada LMS como origen).

### Pasos (unos 10 minutos)

1. Entra a **https://console.cloud.google.com** con la cuenta de Google que
   va a administrar esto (idealmente una de la organizacion, no personal).
2. Arriba, en el selector de proyectos: **Nuevo proyecto** → nombre `Ludus`
   → Crear. Asegurate de que quede seleccionado.
3. Menu → **APIs y servicios** → **Pantalla de consentimiento de OAuth**
   (en la consola nueva se llama **Google Auth Platform**) → **Comenzar**:
   - Nombre de la app: `Ludus`; correo de asistencia: el tuyo.
   - Publico (*Audience*): **Externo** si entran personas con Gmail o con
     cuentas de otras organizaciones; **Interno** solo si todos los usuarios
     son de tu Google Workspace.
   - Datos de contacto: tu correo → Aceptar y **Crear**.
   - No hace falta agregar *scopes*: Ludus solo usa los basicos (correo y
     perfil), que no requieren verificacion de Google.
4. Si elegiste **Externo**, en **Publico** pulsa **Publicar app** (pasa de
   "Prueba" a "En produccion"). Mientras este en "Prueba", solo pueden entrar
   los correos que agregues como *usuarios de prueba*.
5. Menu → **Clientes** (o **APIs y servicios → Credenciales**) →
   **Crear cliente** (o *Crear credenciales → ID de cliente de OAuth*):
   - Tipo de aplicacion: **Aplicacion web**. Nombre: `Ludus web`.
   - **Origenes de JavaScript autorizados**:
     - `https://ludus.nexum-onchain.com`
     - (para probar en tu computadora) `http://localhost:5173` y `http://localhost`
   - **URI de redireccionamiento autorizados**: dejalo vacio (Ludus usa la
     ventana emergente, no redirecciones).
   - **Crear**.
6. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`). El
   *secreto del cliente* **no** se usa: no lo pongas en ningun lado.
7. En el servidor:

   ```bash
   nano ~/ludus/backend/.env
   # GOOGLE_CLIENT_ID=1234567890-xxxxxxxx.apps.googleusercontent.com
   pm2 restart ludus-api
   ```

8. Abre el sitio (Ctrl+F5). Debajo de "Ingresar" aparece **o / Continuar con
   Google**. Prueba con una cuenta que exista en Ludus.

### Si algo falla

| Sintoma | Causa probable |
|---|---|
| El boton no aparece | `GOOGLE_CLIENT_ID` vacio, no reiniciaste PM2, o un bloqueador de anuncios bloquea `accounts.google.com` |
| Google dice "origin_mismatch" / "no autorizado" | Falta el dominio exacto en *Origenes de JavaScript autorizados* (con `https://`, sin `/` al final). Los cambios tardan unos minutos |
| "Acceso bloqueado: esta app no esta verificada" o solo entran algunos | La app sigue en modo **Prueba**: publicala (paso 4) |
| "No hay una cuenta activa de Ludus para ..." | Ese correo no existe en Ludus o el usuario esta inactivo. Darlo de alta (o importarlo) con ese mismo correo |
| "Google no confirmo la sesion" | El `GOOGLE_CLIENT_ID` del `.env` no es el del cliente que dibuja el boton, o la hora del servidor esta muy desfasada (`timedatectl`) |

---

## 3. Google Analytics 4

### Pasos

1. Entra a **https://analytics.google.com** → **Empezar a medir** (o
   **Administrar → Crear → Propiedad** si ya tienes cuenta).
2. Nombre de la propiedad: `Ludus`; zona horaria: la tuya (por ejemplo,
   Mexico); moneda: la tuya. Siguiente → completa los datos del negocio.
3. Plataforma: **Web**. URL: `ludus.nexum-onchain.com`; nombre del flujo:
   `Ludus web`. **Crear flujo**.
4. **Importante, antes de cerrar el flujo:** en *Medicion mejorada* pulsa el
   engranaje y **desactiva "Cambios de pagina basados en eventos del historial
   del navegador"**. Ludus manda cada vista a mano; si dejas esa opcion
   encendida, cada pantalla se cuenta dos veces.
5. Copia el **ID de medicion** (`G-XXXXXXXXXX`), arriba a la derecha del flujo.
6. En el servidor:

   ```bash
   nano ~/ludus/backend/.env
   # GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
   pm2 restart ludus-api
   ```

7. Abre el sitio, navega un poco y mira **Informes → Tiempo real**: en uno o
   dos minutos aparece tu visita.

### Para ver rol, institucion y usuarios

Hazlo una sola vez, en **Administrar** (engranaje, abajo a la izquierda):

1. **Visualizacion de datos → Definiciones personalizadas → Crear dimension
   personalizada**, dos veces:
   - Nombre `Rol`, alcance **Usuario**, propiedad de usuario `rol`.
   - Nombre `Institucion`, alcance **Usuario**, propiedad de usuario `institucion_id`.
2. **Recopilacion y modificacion de datos → Retencion de datos**: sube
   "Datos a nivel de usuario" a **14 meses** (por defecto son 2 y las
   exploraciones viejas quedan vacias).
3. **Identidad de los informes**: deja **Combinada** u **Observada**, asi
   Analytics usa el `user_id` de Ludus para unir las visitas de una misma
   cuenta en distintos dispositivos.

Las dimensiones nuevas solo se llenan con datos que lleguen **despues** de
crearlas (hasta 24-48 h para verse en los informes normales).

### Informes utiles

- **Informes → Interaccion → Paginas y pantallas**: que pantallas se usan
  mas (`panel`, `curso-detalle`, `jugar`, `editor`...). El titulo de cada
  vista es el nombre de la pantalla, no el del curso.
- **Informes → Usuarios → Atributos de usuario**, o cualquier informe con la
  dimension **Rol**: cuanto usan el sitio estudiantes, docentes y admins.
- **Explorar → Explorador de usuarios**: el recorrido de cada `user_id`
  (para saber quien es, buscalo en la vista Accesos de Ludus).
- **Eventos → login**: inicios de sesion, separados por metodo.

### Privacidad (lo que Ludus no resuelve por ti)

Analytics usa cookies. Ludus **no** trae un banner de consentimiento de
cookies. Segun el pais y el publico (por ejemplo, menores de edad, o usuarios
en la Union Europea) puede ser obligatorio pedir consentimiento antes de
cargar Analytics y mencionarlo en el aviso de privacidad. Si lo necesitas,
dimelo y se agrega un banner que cargue Analytics solo despues de aceptar.

---

## 4. Resumen de lo que queda en Ludus

- `backend/.env`: `GOOGLE_CLIENT_ID` y `GOOGLE_ANALYTICS_ID`.
- Backend: `POST /api/autenticacion/google` (verifica la credencial),
  `GET /api/autenticacion/opciones` (ids publicos para el frontend), tabla
  `accesos` y `GET /api/accesos`.
- Frontend: `utilidades/google.ts` (boton), `utilidades/analitica.ts` (GA4),
  vista **Accesos** en el menu del superadmin y del admin de institucion.
