# Ludus — Sistema de Juegos Educativos

Documento unico con el contexto completo de la aplicacion: que es, como esta
organizada, el modelo de datos, los permisos por rol, la API y como correrla
en local. Esta pensado para que cualquier persona (o agente) retome el
proyecto sin tener que leer el prototipo original.

## 1. Origen y alcance

El proyecto nace de un prototipo hecho en Claude Design (`project/Sistema de
Juegos.dc.html`, ver tambien `project/Sistema de Juegos - Wireframes.dc.html`
y las conversaciones en `chats/`). Ese prototipo es solo HTML/CSS/JS de
maqueta; este repositorio es la implementacion real, de punta a punta, con
backend y base de datos propios.

Decisiones de alcance tomadas junto con quien pidio la implementacion:

- **Autenticacion real** con JWT y pantalla de login. El prototipo no tenia
  login (usaba un selector de rol como atajo de demo); aqui el rol siempre
  viene del usuario autenticado, no hay forma de "cambiar de rol" en la UI.
- **Un juego jugable, el resto maqueta.** El prototipo dejo la mecanica de
  juego fuera a proposito ("Pendientes que no hice a proposito: juegos
  realmente jugables"). Hoy **Mesa de Cumplimiento** ya tiene mecanica real y
  contenido tomado del curso de Cripto Compliance (ver 6.2); las otras cinco
  plantillas siguen siendo maqueta visual: se configuran con parametros reales
  y registran un intento, pero la partida es simulada. El catalogo marca cuales
  son jugables con la bandera `jugable`.
- **Monorepo sin Docker.** `backend/` y `frontend/` viven en el mismo
  repositorio; se asume que ya existe un PostgreSQL accesible (local o
  remoto) y solo se documentan las variables de conexion.
- **Backend en PHP (Laravel)** para poder alojarlo en un hosting compartido
  con cPanel, que corre PHP sin nada extra. El backend empezo en NestJS; la
  seccion 10 cuenta como se paso a Laravel sin perder nada (misma API, misma
  base, mismas sesiones).

## 2. Idioma y convenciones de codigo

- Todo el codigo (variables, funciones, archivos, carpetas, nombres de
  columnas y tablas) esta en **espanol sin caracteres especiales**: sin
  tildes ni enie (`institucion`, no `institución`; `nino` no existe en este
  dominio pero seria el criterio). Esto aplica a backend y frontend.
- El texto que ve el usuario final (labels, mensajes) tambien evita tildes
  por consistencia, aunque no es un requisito tecnico como en el codigo.
- Principio general: **KISS**. Se prefirio simplicidad y menos capas antes
  que abstracciones genericas. Varias simplificaciones deliberadas estan
  anotadas en la seccion 7.

## 3. Estructura del repositorio

```
/
├── backend/          Backend Laravel 12 (API REST + PostgreSQL), PHP 8.2+
│   └── public/archivos/  Imagenes del juego (fondos y personajes); se sirve en /archivos
├── frontend/          Frontend Vue 3 (SPA)
├── project/           Prototipo original de Claude Design (referencia, no se ejecuta)
├── chats/              Transcripciones de las conversaciones de diseno (referencia)
├── ESTRUCTURA.md       Este documento
└── DESPLIEGUE.md        Como subirlo a cPanel, o a Neon + Vercel
```

### 3.1 Backend (`backend/`)

Es un proyecto Laravel, pero organizado **por dominio**, igual que antes: una
carpeta por area del negocio dentro de `app/Modulos/`, cada una con su
controlador (rutas HTTP y validacion de entrada) y su servicio (reglas de
negocio y acceso a datos). Los nombres de carpetas, clases y metodos estan en
espanol; lo unico en ingles es lo que Laravel exige por convencion
(`app/`, `config/`, `routes/`, `database/migrations/`, `public/`).

```
backend/
├── app/
│   ├── Modulos/                     Un modulo por area del negocio
│   │   ├── Autenticacion/            ingresar, perfil, cambiar clave
│   │   ├── Instituciones/            CRUD instituciones (solo superadmin)
│   │   ├── Usuarios/                 CRUD usuarios, alcance segun quien consulta
│   │   ├── Cursos/                   CRUD cursos + sus modulos (orden, mover)
│   │   ├── Rutas/                    CRUD rutas + su relacion ordenada con cursos existentes
│   │   ├── Inscripciones/            Asigna/reemplaza la lista de estudiantes de un curso o ruta
│   │   ├── Solicitudes/              Ingreso/salida que pide un estudiante y resuelve un admin
│   │   ├── Resultados/               Resultado de una partida (puntaje, intento, nota)
│   │   ├── Panel/                    /panel/resumen y /panel/actividad
│   │   ├── Archivos/                 Guarda, lista y sirve las imagenes del juego
│   │   ├── Juegos/                   Catalogo + configuracion por modulo + partida
│   │   │   └── MesaCumplimiento/      el juego jugable, con todo su contenido adentro
│   │   │       ├── MesaCumplimientoServicio.php   armar partida, veredicto, calificacion
│   │   │       ├── CasosControlador/Servicio      casos (catalogo base y propios)
│   │   │       └── Personajes/                    los CEO de la escena (CRUD + subida de imagen)
│   │   └── Scorm/                    Exportacion de un modulo como paquete SCORM 1.2
│   │       └── plantilla/             archivos que se empaquetan en el ZIP (ver 6.1)
│   ├── Modelos/                      Un modelo Eloquent por tabla (Usuario, Curso, ModuloCurso...)
│   │   └── ModeloBase.php             UUID, fechas creado_en/actualizado_en y JSON en camelCase
│   ├── Soporte/                      Piezas transversales
│   │   ├── ConexionBd.php             Decide DATABASE_URL vs variables sueltas segun DB_ORIGEN (ver 8.2.1)
│   │   ├── ConectorPostgres.php       Timeout de conexion y endpoint de Neon para libpq viejas
│   │   ├── Jwt.php                    Firma y verifica los tokens (HS256)
│   │   ├── Claves.php                 bcrypt (compatible con las claves que ya estan en la base)
│   │   ├── Validacion.php             Valida el cuerpo y rechaza campos que el endpoint no espera
│   │   ├── Rol.php                    superadmin | admin_institucion | docente | estudiante
│   │   └── UsuarioAutenticado.php     Quien hace la peticion (sale del token)
│   ├── Http/
│   │   ├── Controlador.php            Base de los controladores: quien(), validar(), sinContenido()
│   │   └── Middleware/                AutenticarJwt ('jwt'), ExigirRol ('rol:...'), AjustarRespuesta
│   ├── Excepciones/ErrorHttp.php      Errores con codigo HTTP, respondidos como { message, statusCode }
│   └── Consola/                       Comandos de artisan: semilla, bd:verificar, servir
├── bootstrap/app.php                 Rutas bajo /api, middlewares y formato JSON de todos los errores
├── config/
│   ├── ludus.php                     JWT, URL_PUBLICA_API, RUTA_ARCHIVOS
│   ├── database.php                  Solo PostgreSQL; la conexion la arma ConexionBd
│   └── cors.php                      Cualquier origen (frontend en otro dominio, paquetes SCORM)
├── database/
│   ├── migrations/                   El esquema en SQL, identico al que creaba TypeORM
│   └── datos/casos_base.php          Los 13 casos base que carga la migracion
├── lang/es/validation.php            Mensajes de validacion en espanol
├── routes/
│   ├── api.php                       Todas las rutas de la API, con su rol requerido
│   └── web.php                       Solo /archivos (cuando RUTA_ARCHIVOS esta fuera de public/)
├── public/
│   ├── index.php                     Punto de entrada: el dominio de la API apunta aqui
│   └── archivos/                     Fondos y personajes del juego
└── .htaccess                         Si el dominio apunta a backend/ y no a public/, redirige a public/
```

Cada modulo sigue siempre el mismo patron: `XControlador.php` recibe la
peticion, valida el cuerpo con reglas de Laravel y llama al servicio;
`XServicio.php` tiene las reglas de negocio y consulta la base con los
modelos de `app/Modelos/`. Las rutas y los roles que exige cada una estan
todos juntos en `routes/api.php`.

**Nombres en la base y en la API.** Las columnas estan en snake_case
(`institucion_id`, `creado_en`) y el JSON de la API en camelCase
(`institucionId`, `creadoEn`), como siempre fue. La traduccion se hace en un
solo lugar, `ModeloBase::toArray()`; dentro del PHP se usa el nombre de la
columna.

### 3.2 Frontend (`frontend/src`)

```
frontend/src/
├── main.ts                    Monta la app, importa los estilos globales
├── App.vue                    Decide si mostrar el layout con barra o la pantalla de login
├── vite-env.d.ts               Tipos de Vite + modulos *.vue y *.module.css
├── estilos/
│   ├── variables.css           Tokens de diseno (colores, tipografia) en :root, tema claro/oscuro
│   └── base.css                 Reset minimo de HTML/body/scroll
├── tipos/index.ts               Interfaces TypeScript que reflejan las entidades del backend
├── servicios/                    Un archivo por recurso, llama a la API con axios
├── almacenes/autenticacion.ts    Store de Pinia: token, usuario, ingresar(), cerrarSesion()
├── composables/
│   ├── usarTema.ts               Alterna claro/oscuro y lo persiste en localStorage
│   ├── usarNavegacion.ts         Items del menu lateral segun el rol
│   └── usarNotificaciones.ts     "Toast" simple compartido entre vistas
├── enrutador/indice.ts            Rutas de vue-router + guardia de autenticacion/rol
├── utilidades/
│   ├── archivos.ts                URL de las imagenes del backend y lectura de un archivo a base64
│   └── errores.ts                  Saca el mensaje que manda el backend cuando rechaza algo
├── componentes/
│   ├── base/                     Piezas de UI genericas y reutilizables (Boton, Modal, Tabla, ...)
│   ├── diseno/                    Layout de la aplicacion (BarraSuperior, BarraLateral, EsqueletoApp)
│   ├── editor/                     Pestanas del editor de cada juego (EditorCasos, EditorPersonajes)
│   └── juegos/                     Los juegos jugables (MesaCumplimiento: escena + expediente)
└── vistas/                        Una vista por pantalla (ver seccion 5)
```

**Sobre el CSS**: no hay ningun bloque `<style>` dentro de archivos `.vue`.
Cada componente que necesita estilos propios importa su archivo
`Nombre.module.css` (CSS Modules: las clases se generan con nombres unicos y
se referencian como objeto JS, `estilos.claseX`). Los unicos estilos
"globales" son `estilos/variables.css` (tokens/colores) y `estilos/base.css`
(reset), que se importan una sola vez en `main.ts`; no son etiquetas
`<style>`, son hojas de estilo normales importadas como archivo. No se usa
Tailwind ni ningun framework de utilidades.

La unica excepcion es el fondo de la escena del juego, que depende de una URL
que llega del servidor: la vista solo define la variable CSS `--fondo-escena`
y todas las reglas visuales siguen viviendo en el archivo `.module.css`.

## 4. Modelo de datos

```
institucion 1───* usuario (rol: superadmin sin institucion, resto con institucion)
institucion 1───* curso
institucion 1───* ruta

curso 1───* modulo_curso (submodulo con orden, titulo, descripcion, califica)
modulo_curso 1───1 configuracion_juego (opcional; se crea al configurar el juego)
juego 1───* configuracion_juego (catalogo fijo de plantillas)

ruta 1───* ruta_curso (tabla puente: que cursos y en que orden forman la ruta)
ruta_curso *───1 curso

usuario(estudiante) 1───* inscripcion (a un curso O a una ruta, nunca ambos en el mismo registro)
usuario(estudiante) 1───* solicitud (ingreso/salida a un curso o ruta, con estado)
usuario(estudiante) 1───* resultado (puntaje de un intento de un modulo)

institucion 1───* personaje (el CEO que aparece en escena; institucion_id null = catalogo base)
institucion 1───* caso_cumplimiento (expediente del juego; institucion_id null = catalogo base)
personaje 1───* caso_cumplimiento (opcional: un caso puede no tener personaje)
```

Puntos que vale la pena aclarar:

- Un **curso** existe por si mismo; una **ruta** es una secuencia de cursos
  que ya existen (no puede haber ruta sin cursos, pero un curso no depende
  de ninguna ruta).
- **inscripcion** es el registro real de "este estudiante esta metido en
  este curso/ruta". La pantalla "Asignar estudiantes" reemplaza toda la
  lista de una vez (`PUT /cursos/:id/inscripciones` con el arreglo completo
  de ids), igual que hacia el prototipo.
- **solicitud** es el flujo de autoservicio del estudiante: pide entrar o
  salir, y un admin la aprueba o rechaza. Aprobar una solicitud de ingreso
  crea la inscripcion; aprobar una de salida la borra.
- **juego** es un catalogo fijo (6 plantillas: Viborita Numerica, Torre de
  Bloques, Memorama, Burbujas, Ordena la Secuencia, Laberinto) que carga el
  script de semilla. No tiene CRUD de usuario porque, segun la definicion
  del negocio, las plantillas las programa el equipo de desarrollo; los
  roles con permiso solo las **seleccionan y configuran** por modulo
  (`configuracion_juego`: velocidad, tiempo, pares, intentos, puntaje).
- **resultado** guarda cada intento jugado (puntaje e intento consecutivo).
  La nota solo se calcula (`puntaje / 10`) si el modulo esta marcado como
  `califica`; si no, `nota` queda `null` y cuenta solo como practica.
- **personaje** y **caso_cumplimiento** son el contenido editable del juego
  jugable (ver 6.2). Los dos usan la misma regla de alcance:
  `institucion_id = NULL` es el **catalogo base de Ludus**, visible para todos
  y editable solo por el superadmin; con un `institucion_id` son de esa
  institucion, y ahi el docente manda.

## 5. Roles y pantallas

Hay exactamente 4 roles (`app/Soporte/Rol.php` en el backend):

| Rol | Alcance |
|---|---|
| `superadmin` | Todo el sistema. CRUD de instituciones y de cualquier usuario. |
| `admin_institucion` | Su institucion. CRUD de docentes/estudiantes, cursos y rutas de su institucion; resuelve solicitudes. |
| `docente` | Sus cursos y rutas de su institucion; configura juegos; solo consulta usuarios. |
| `estudiante` | Pide inscripcion/salida, cursa lo que tiene asignado, juega, ve sus resultados. |

Pantallas (una vista de Vue por cada una, ver `frontend/src/vistas/`):

| Vista | Ruta | Quien la ve |
|---|---|---|
| `AutenticacionVista` | `/ingresar` | publica |
| `PanelVista` (dashboard) | `/` | todos, contenido distinto por rol |
| `InstitucionesVista` | `/instituciones` | superadmin |
| `UsuariosVista` | `/usuarios`, `/docentes`, `/estudiantes` | superadmin, admin_institucion, docente (solo lectura) |
| `CursosVista` | `/cursos` | todos (tarjetas; acciones segun rol) |
| `CursoDetalleVista` | `/cursos/:id` | todos (modulos, asignar estudiantes, jugar) |
| `RutasVista` / `RutaDetalleVista` | `/rutas`, `/rutas/:id` | todos |
| `ExplorarCursosVista` | `/explorar` | estudiante |
| `JuegosVista` | `/juegos` | todos (catalogo de solo lectura) |
| `ConfiguracionJuegoVista` | `/cursos/:cursoId/modulos/:moduloId/configurar` | superadmin, admin_institucion, docente |
| `EditorVista` (Editor) | `/editor` | superadmin, admin_institucion, docente |
| `EditorJuegoVista` | `/editor/:clave` | superadmin, admin_institucion, docente |
| `JugarVista` | `/cursos/:cursoId/modulos/:moduloId/jugar` | estudiante |
| `SolicitudesVista` | `/solicitudes` | superadmin, admin_institucion, estudiante |
| `ResultadosVista` (Resultados/Calificaciones) | `/resultados` | todos |
| `ActividadVista` | `/actividad` | superadmin |
| `PaquetesScormVista` | `/scorm` | superadmin, admin_institucion, docente |
| `AjustesVista` (Mi perfil) | `/ajustes` | todos |

El menu lateral (`composables/usarNavegacion.ts`) arma los items visibles
segun el rol; el `enrutador/indice.ts` ademas bloquea por `meta.roles` en
cada ruta, asi que la restriccion no depende solo de "no mostrar el boton".

### 5.1 Cuenta propia: perfil, contrasena y cierre de sesion

Cualquier rol administra su propia cuenta desde `AjustesVista` ("Mi perfil"),
a la que se llega por el menu de la barra superior (avatar → "Mi perfil") o
por el item del menu lateral en los roles que lo tienen:

- **Editar perfil**: cambia nombre y correo (`PATCH /autenticacion/perfil`).
  Como el JWT lleva el nombre y el correo, el backend **reemite el token** y
  el frontend reemplaza la sesion guardada; por eso la barra superior se
  actualiza al instante. El correo se valida como unico.
- **Cambiar contrasena** (`PATCH /autenticacion/clave`): exige la contrasena
  actual y la verifica con bcrypt (`password_verify`) **antes** de guardar la nueva.
  Rechaza tambien que la nueva sea igual a la actual, y el frontend valida
  ademas el minimo de 6 caracteres y que la confirmacion coincida. Ningun rol
  puede cambiar la contrasena de otro usuario por esta via.
- **Cerrar sesion**: limpia token y usuario de `localStorage` y redirige a
  `/ingresar`, tanto desde el menu de la barra superior como desde el boton
  en "Mi perfil".

Dos detalles de implementacion que conviene conocer antes de tocar esto:

- El interceptor de axios (`servicios/cliente.ts`) cierra la sesion ante un
  401, pero **excluye** `/autenticacion/clave`: ahi un 401 significa
  "contrasena actual incorrecta" y la sesion sigue siendo valida.
- `App.vue` no renderiza una vista protegida cuando no hay sesion. Al cerrar
  sesion el usuario queda en `null` un instante antes de que el enrutador
  redirija, y sin esa guarda la vista se volveria a renderizar sin sesion.

## 6. API (resumen)

Todo bajo el prefijo `/api`. Autenticacion con `Authorization: Bearer
<token>` (JWT). El cuerpo de cada peticion se valida en el controlador
(`app/Soporte/Validacion.php`): reglas por campo y rechazo de cualquier campo
que el endpoint no espera. Las respuestas son JSON de los registros, en
camelCase.

Formato de los errores (lo lee `frontend/src/utilidades/errores.ts`):

```
{ "message": "Curso no encontrado", "error": "Not Found", "statusCode": 404 }
{ "message": ["El campo nombre es obligatorio."], "error": "Bad Request", "statusCode": 400 }
```

Un `POST` que sale bien responde `201`; un `DELETE`, `200` sin cuerpo; el
cambio de clave, `204`. Un token ausente, invalido o vencido es `401`
("Unauthorized") y el frontend cierra la sesion; un rol sin permiso es `403`.

```
POST   /autenticacion/ingresar          { correo, clave } -> { tokenAcceso, usuario }
GET    /autenticacion/perfil
PATCH  /autenticacion/perfil            { nombre?, correo? } -> { tokenAcceso, usuario }
PATCH  /autenticacion/clave             { claveActual, claveNueva } -> 204

GET|POST /instituciones                 superadmin
GET|PATCH|DELETE /instituciones/:id     superadmin

GET|POST /usuarios                      alcance segun rol; ?rol= filtra
GET|PATCH|DELETE /usuarios/:id

GET|POST /cursos                        alcance segun rol
GET      /cursos/explorar               estudiante: cursos de su institucion en los que no esta
GET|PATCH|DELETE /cursos/:id
POST|PATCH|DELETE /cursos/:id/modulos[/:moduloId]
PATCH    /cursos/:id/modulos/:moduloId/mover   { direccion: 'arriba' | 'abajo' }

GET|POST /rutas
GET|PATCH|DELETE /rutas/:id
POST|DELETE /rutas/:id/cursos[/:cursoId]

GET      /juegos                         catalogo (todos los roles autenticados)
GET|PUT  /juegos/modulos/:moduloId/configuracion
GET      /juegos/partida/:moduloId        expedientes de la partida, sin respuestas
POST     /juegos/partida/verificar        { casoId, decision } -> veredicto del caso
POST     /juegos/partida/:moduloId/terminar  califica en el servidor y registra el intento
```

Contenido de un juego jugable: cuelga de su clave, porque es de ese juego y
no un recurso suelto del sistema.

```
GET|POST /juegos/mesa-cumplimiento/casos               casos (superadmin/admin/docente)
POST     /juegos/mesa-cumplimiento/casos/duplicar-base copia el catalogo base; { ids } copia solo esos
PATCH|DELETE /juegos/mesa-cumplimiento/casos/:id       el catalogo base solo lo edita el superadmin

GET|POST /juegos/mesa-cumplimiento/personajes             los CEO de la escena
GET      /juegos/mesa-cumplimiento/personajes/disponibles imagenes en el servidor aun sin registrar
PATCH|DELETE /juegos/mesa-cumplimiento/personajes/:id

GET|PUT  /cursos/:cursoId/inscripciones   reemplaza la lista completa de estudiantes
GET|PUT  /rutas/:rutaId/inscripciones

GET|POST /solicitudes                     crear: solo estudiante
PATCH    /solicitudes/:id                 { estado: 'aprobada' | 'rechazada' }; solo admin/superadmin

GET|POST /resultados                      crear: solo estudiante (al terminar una partida)

GET      /panel/resumen                   KPIs segun el rol de quien consulta
GET      /panel/actividad                 solo superadmin

GET|POST /scorm/paquetes                  paquetes exportados (superadmin/admin/docente)
GET      /scorm/diagnostico               a que URL apuntan los paquetes y si esa URL sirve
GET      /scorm/paquetes/:id/descargar    devuelve el ZIP del paquete
PATCH    /scorm/paquetes/:id              { activo } activa o revoca el paquete
DELETE   /scorm/paquetes/:id

GET      /scorm/publico/:token            datos del modulo para la pantalla de login (sin sesion)
POST     /scorm/publico/:token/ingresar   login del estudiante desde el LMS
GET      /scorm/publico/:token/partida    expedientes de la Mesa de Cumplimiento (requiere el token del login)
POST     /scorm/publico/:token/verificar  veredicto de un caso
POST     /scorm/publico/:token/partida    califica la partida en el servidor y registra el intento
POST     /scorm/publico/:token/resultado  guarda el intento de un juego maqueta
```

## 6.1 Exportacion a SCORM (usar un modulo dentro de otro LMS)

Un docente (o admin/superadmin) puede empaquetar un modulo como actividad
**SCORM 1.2** y subirla a un LMS externo (Moodle, Canvas, Blackboard...). El
estudiante juega desde ese LMS, pero su avance se sigue registrando en Ludus.

**Como se genera.** En el detalle del curso, cada modulo que ya tiene un juego
configurado muestra la accion "Exportar como paquete SCORM". Eso crea un
registro en `paquetes_scorm` y descarga un ZIP con:

```
index.html         pantalla de login + juego + resultado
estilos.css        identidad visual de Ludus, sin recursos externos
ludus-scorm.js     API del LMS + llamadas a Ludus
configuracion.js   generado por Ludus: URL de la API y token del paquete
imsmanifest.xml    manifiesto SCORM 1.2 (un unico SCO)
LEEME.txt          instrucciones para quien lo sube al LMS
```

**Como se ejecuta.** Al abrirlo en el LMS, el paquete:

1. Busca la API del LMS (`window.API`, subiendo por `parent`/`opener`) y llama
   `LMSInitialize`. Si no hay LMS, sigue funcionando y lo dice en pantalla.
2. Pide al estudiante su correo y contrasena **de Ludus**. El paquete no lleva
   credenciales: el token solo identifica que modulo abrir.
3. Valida en el backend que sea un estudiante, que el paquete siga activo y que
   este **inscrito en el curso** del modulo. Si no, no lo deja entrar.
4. Carga el juego con los parametros que configuro el docente.
5. Al terminar guarda el intento en Ludus (aparece en Resultados y en las
   calificaciones, igual que si hubiera jugado dentro de la app) y lo reporta
   al LMS: `cmi.core.score.raw`, `score.min`/`max`, `cmi.core.session_time`,
   `cmi.core.lesson_status` (`passed`/`failed` si el modulo califica, con
   umbral 60; `completed` si es practica) y `cmi.comments` con el nombre y
   correo de la cuenta de Ludus que jugo.

**Revocar.** La pantalla "Paquetes SCORM" lista lo exportado y permite
desactivar (corta el acceso sin borrar resultados), reactivar, volver a
descargar o eliminar.

### 6.1.1 `URL_PUBLICA_API`: el ajuste que hay que hacer si o si

El ZIP lleva **grabada** la direccion de la API en `configuracion.js`, tomada
de `URL_PUBLICA_API` **en el momento de exportar**. El paquete corre en el
navegador del estudiante, dentro del sitio del LMS, asi que esa direccion tiene
que ser alcanzable desde ahi. Los tres casos que no funcionan:

| Valor | Que pasa |
|---|---|
| `http://localhost:3000/api` (por defecto) | Para el estudiante, `localhost` es **su** computadora. Chrome ademas bloquea que un sitio publico pida al espacio `loopback`. |
| `http://192.168.x.x:3000/api` | Solo sirve dentro de esa red, y los navegadores bloquean que un sitio publico pida a una red privada. |
| `http://mi-dominio.com/api` con un LMS en HTTPS | Contenido mixto: el navegador bloquea HTTP desde una pagina HTTPS. |

Lo que sirve: **Ludus publicado en una direccion de internet, por HTTPS**, con
esa URL en `URL_PUBLICA_API`, y **volver a exportar** los paquetes (los ya
exportados conservan la direccion vieja).

Para no descubrirlo cuando el estudiante ve la pantalla en blanco, esto avisa
en tres lugares:

- La pantalla **Paquetes SCORM** muestra siempre a que direccion apuntan los
  paquetes, y la marca en amarillo con el motivo cuando no va a funcionar
  (`GET /scorm/diagnostico`).
- El **LEEME.txt** del ZIP incluye la misma advertencia.
- Si aun asi se sube, el paquete **no dice "Failed to fetch"**: nombra la
  direccion y explica que hay que publicar Ludus y reexportar.

**Por que el cmi.comments.** El usuario del LMS no tiene por que ser el mismo
que la cuenta de Ludus, asi que el paquete deja constancia de con que cuenta se
jugo realmente. El seguimiento fino (intentos, notas, historico) vive en Ludus;
el LMS recibe la nota del intento.

## 6.2 Juego jugable: Mesa de Cumplimiento

Es el primer juego del catalogo con mecanica real (los demas siguen siendo
maqueta). Esta inspirado en *That's Not My Neighbor*: en vez de dejar pasar
personas, el estudiante atiende la mesa de Cumplimiento de un banco boliviano y
decide sobre solicitudes de **PSAV/VASP**.

**Contenido.** Los 13 casos base salen del curso de Cripto Compliance de NEXUM
(modulos 1 a 4): criterio funcional de PSAV de la R.A. UIF 19/2025, ROG-04,
Recomendacion 15 y Travel Rule de GAFI, due diligence de PSAV/VASP y analisis
de exposicion on-chain. Cada caso cita el modulo y tema del que proviene.
Estan en la base de datos, no en el codigo: **el docente los edita** (ver
6.2.2).

### 6.2.1 La escena

El expediente no llega solo: entra el **CEO de la empresa**, mirando al
jugador, sobre el fondo del juego, y trae su solicitud en un globo. El CEO
reacciona al veredicto (asiente si acertaste, niega si no) y en cada
expediente entra de nuevo con una animacion.

Las imagenes son **archivos, no codigo**. Viven en `RUTA_ARCHIVOS` (por
defecto `backend/public/archivos/`) y se sirven en `/archivos`, fuera del
prefijo `/api`. Al estar dentro de `public/`, Apache las entrega directo, sin
pasar por PHP:

| Que | Donde | Como se usa |
|---|---|---|
| Fondo de la mesa | `archivos/fondos/mesa-cumplimiento.png` | nombre fijo por convencion; si falta, la escena usa un degradado |
| Fotos de los CEO | `archivos/personajes/*.png` | cada una se registra como un personaje desde la aplicacion |

Recomendado para los CEO: PNG con fondo transparente, vertical, de medio
cuerpo y mirando al frente; maximo 3 MB. Para el fondo: apaisado, 1600x900 o
mas, con lo importante arriba y a los costados (el centro-abajo queda tapado
por el personaje y el globo). Todo esto tambien esta en
`backend/public/archivos/README.md`.

Un personaje entra de dos maneras, y las dos terminan en una fila de la tabla
`personajes`:

1. **Dejando el archivo en la carpeta**: aparece en *Personajes* como "imagen
   disponible en el servidor" y el docente solo le pone nombre y cargo.
2. **Subiendolo desde Ludus**: el docente elige el archivo y se guarda con un
   nombre aleatorio. Estos si se borran del disco al eliminar el personaje;
   los que se dejaron a mano se conservan.

Un caso sin personaje se juega igual: la escena muestra una silueta neutra.

### 6.2.2 Lo que edita el docente

Todo el contenido de los juegos se edita desde el **Editor** (`/editor`), que
lista el catalogo y marca cuales tienen contenido editable. Cada juego abre su
**propio editor** (`/editor/:clave`), porque cada uno edita cosas distintas: un
memorama editaria pares, no expedientes. El menu lateral tiene una sola entrada
("Editor"), no una por cada tipo de contenido.

El editor de la Mesa de Cumplimiento tiene dos pestanas, **Casos** y
**Personajes**. En Casos el docente escribe el expediente completo:

- **Cabecera**: entidad, tipo, jurisdiccion y solicitud.
- **CEO que aparece**: cual de los personajes presenta el caso.
- **Los seis campos del expediente**, que son los que el curso usa para
  decidir: *Registro / licencia*, *Travel Rule*, *Beneficiario final*,
  *Controles AML*, *Sanciones* y *Exposicion on-chain*. Un campo vacio no se
  muestra.
- **Otros datos**: pares etiqueta/valor libres para lo que no entra en los
  seis (hops, materialidad, modelo operativo, razonabilidad economica...).
- **La respuesta**: Aprobar, Aprobar con EDD o Rechazar, mas la regla, la
  explicacion que se muestra despues y el origen en el curso.
- **Activo**: un caso inactivo deja de salir en las partidas sin borrarse.

### 6.2.3 Catalogo base y casos propios

Regla de alcance, la misma que para personajes: mientras la institucion no
tenga casos propios, la mesa juega con el **catalogo base de Ludus** (que se
ve pero no se edita, porque es comun a todas las instituciones). En cuanto
tiene uno propio, la partida se arma **solo** con los de la institucion.

El docente nunca edita el catalogo base: lo **copia**. Hay dos caminos, y los
dos llegan a la misma tabla con el `institucion_id` de su institucion:

| Accion | Cuando | Que hace |
|---|---|---|
| *Duplicar catalogo base completo* | mientras no tenga casos propios | copia los 13 de una vez, para arrancar con contenido y editarlo |
| *Agregar del catalogo base (N)* | una vez que ya tiene los suyos | abre el catalogo, se tildan los que se quieran y copia solo esos |

Asi se puede tener una mesa hecha a medida y aun asi traer un caso base
puntual cuando hace falta. El contador N es cuantos casos base todavia no
estan copiados: se comparan por nombre de entidad, asi que un caso ya copiado
no se vuelve a ofrecer. Si despues se le cambia el nombre a la copia, el caso
base vuelve a aparecer como disponible.

`POST /juegos/mesa-cumplimiento/casos/duplicar-base` cubre los dos caminos:
sin cuerpo copia todo el catalogo, con `{ ids: [...] }` copia solo esos.

La lista muestra lo que van a jugar los estudiantes. Una vez que hay casos
propios, los base dejan de listarse para no mostrar cada caso dos veces; el
superadmin, que es quien mantiene ese catalogo, si los ve.

**Tres decisiones, no dos.** El curso es explicito en que la respuesta correcta
no es binaria, asi que el juego ofrece:

- **Aprobar** — relacion con controles estandar.
- **Aprobar con EDD** — limites, condiciones y monitoreo reforzado.
- **Rechazar** — el riesgo no es mitigable.

**Lo que evalua.** El banco de casos tiene trampas en las dos direcciones, que
es justamente lo que el curso quiere corregir:

- *Registro no es riesgo bajo*: un PSAV registrado con P2P, proveedores
  extranjeros y exposicion DeFi necesita EDD, no aprobacion automatica.
- *No de-risking indiscriminado*: un PSAV registrado, con UBO claro y modelo
  simple debe aprobarse; rechazarlo cuenta como error.
- *Criterio funcional*: quien intercambia y custodia para terceros con fines de
  lucro es PSAV aunque diga que no; quien solo usa activos virtuales para su
  operacion no lo es.
- *Materialidad*: exposicion indirecta a un mixer a 5 hops, 0,2% y de hace dos
  anios no es material; exposicion directa a darknet, 31% y vigente si lo es.

Por eso el resumen final separa **rechazos sin sustento** (de-risking) de
**riesgos que dejaste pasar**: son fallas distintas y el curso las trata como
tales.

**Como esta implementado.** El banco de casos y la calificacion viven en el
backend (`app/Modulos/Juegos/MesaCumplimiento/`), nunca en el cliente:

- `GET /juegos/partida/:moduloId` entrega los expedientes **sin** la respuesta
  correcta (con el personaje y el fondo de la escena); la cantidad sale de
  `paresContenido` de la configuracion.
- `POST /juegos/partida/verificar` devuelve el veredicto de un caso, para dar
  retroalimentacion inmediata con la regla del curso.
- `POST /juegos/partida/:moduloId/terminar` recalcula la nota en el servidor a
  partir de las respuestas y registra el intento como cualquier otro resultado.

El catalogo de juegos tiene ahora `clave` (identificador estable) y `jugable`.
El frontend y el paquete SCORM usan esa clave para decidir si renderizan el
juego real o la maqueta, asi que agregar un segundo juego jugable no exige
tocar las vistas existentes.

`database/datos/casos_base.php` no es el banco en vivo: es la **semilla** que
la migracion carga como catalogo base. Las etiquetas de los seis campos y de
las tres decisiones viven en `MesaCumplimientoServicio.php`.

**Dentro del LMS.** El paquete SCORM ejecuta exactamente el mismo juego, con la
misma escena, consumiendo los endpoints publicos equivalentes con el token del
paquete. Las imagenes se piden al servidor de Ludus con URL absoluta (derivada
de `URL_PUBLICA_API`), porque el paquete corre en el dominio del LMS. La nota
que llega al LMS es la calculada por el servidor.

## 7. Simplificaciones deliberadas (KISS)

Estas decisiones se tomaron para no sobre-construir funcionalidad que el
prototipo tampoco resolvia, o que no aporta al alcance pedido:

- **Solo un juego tiene mecanica real.** Ver 6.2. Para las otras cinco
  plantillas `JugarVista` simula el puntaje; el backend si persiste un
  `resultado` real con ese puntaje.
- **"Actividad" es una vista derivada, no una bitacora de auditoria.**
  `PanelServicio::actividadReciente()` arma la lista combinando las tablas
  existentes (ultimos cursos, solicitudes, resultados, usuarios) en vez de
  mantener una tabla de eventos aparte. Solo la usa el superadmin, igual que
  en el prototipo.
- **El progreso de un estudiante en un curso se calcula, no se guarda.**
  Se deriva de cuantos modulos distintos tienen al menos un `resultado` de
  ese estudiante contra el total de modulos del curso. No existe una
  columna "progreso".
- **Docente ve estudiantes de su institucion, no solo los de sus cursos.**
  El prototipo insinuaba un filtro mas fino (solo alumnos inscritos en sus
  cursos); se opto por el alcance mas simple (toda la institucion, solo
  lectura) para no duplicar logica de inscripciones en el modulo de
  usuarios.
- **"Configurar juego" fusiona los dos pasos del prototipo.** En el
  prototipo primero se elegia la plantilla en un modal y despues se abria
  una pantalla de configuracion. Aqui `ConfiguracionJuegoVista` hace ambas
  cosas en una sola pantalla: elegir plantilla y ajustar parametros.
- **Sin "en cuantas rutas esta este curso" en la tarjeta de curso.** El
  prototipo mostraba una etiqueta con esa cuenta; se omitio para no agregar
  una consulta cruzada extra solo por un dato decorativo.
- **`nota` y `califica` no se duplican.** El prototipo guardaba `graded` en
  el modulo y tambien en la configuracion del juego. Aqui la unica fuente
  de verdad es `modulo_curso.califica`; el interruptor de "Calificacion" en
  la pantalla de configuracion de juego lee y escribe ese mismo campo.

## 8. Como correr el proyecto en local

Para subirlo a un servidor, ver **DESPLIEGUE.md**: cubre cPanel (backend y
frontend), Neon para la base y Vercel para el frontend, con las variables de
entorno de cada caso.

### 8.1 Requisitos

- **Backend**: PHP 8.2 o superior con las extensiones `pdo_pgsql`, `zip`,
  `mbstring` y `openssl`, y [Composer](https://getcomposer.org).
- **Frontend**: Node.js 20+ (solo para el frontend; el backend no usa Node).
- PostgreSQL accesible (local o remoto). Este proyecto **no crea la base de
  datos**; hay que crearla antes.

### 8.2 Base de datos

```bash
# Ejemplo con un Postgres local
sudo -u postgres psql -c "CREATE USER sistema_juegos WITH PASSWORD 'sistema_juegos';"
sudo -u postgres psql -c "CREATE DATABASE sistema_juegos OWNER sistema_juegos;"
```

### 8.2.1 Local o Neon: `DB_ORIGEN`

El `.env` puede tener cargadas **las dos** formas de conexion a la vez — las
variables sueltas de un Postgres local y la `DATABASE_URL` de Neon — y
`DB_ORIGEN` elige cual usar sin que haya que borrar ninguna:

```bash
DB_ORIGEN=local   # usa DB_HOST/DB_PUERTO/... ; ignora DATABASE_URL
DB_ORIGEN=neon    # usa DATABASE_URL ; ignora las variables sueltas
#                 # vacio: si hay DATABASE_URL la usa, si no cae a local
```

Toda la logica vive en `app/Soporte/ConexionBd.php`, y de ahi la toma todo lo
que abre una conexion (la API, `bd:verificar`, `migrate` y `semilla`), asi que
siempre coinciden en cual base estan usando. Un `DB_ORIGEN` invalido, o
`DB_ORIGEN=neon` sin `DATABASE_URL`, hace que nada arranque, con un mensaje
que dice exactamente que falta, en vez de conectarse a la base equivocada.

Con Neon, el `sslmode` de la URL activa TLS solo. Si la libpq del servidor es
vieja (pasa en cPanel) y Neon responde "Endpoint ID is not specified",
`ConectorPostgres` reintenta pasando el endpoint, que es la salida que
documenta Neon; no hay que tocar nada.

### 8.3 Backend

```bash
cd backend
cp .env.example .env         # ajusta las credenciales si no usaste las de arriba
composer install
php artisan bd:verificar      # comprueba que la base responda antes de seguir
php artisan migrate --force   # crea las tablas y carga los 13 casos base
php artisan semilla           # carga instituciones, usuarios y datos de ejemplo
php artisan servir            # http://localhost:3000/api
```

`php artisan servir` levanta la API en el puerto de `PUERTO` (3000), que es
donde el frontend la espera en desarrollo. Los cambios en el codigo o en el
`.env` se toman en la siguiente peticion, sin reiniciar.

**Las migraciones no pisan una base existente.** Cada una revisa primero si
sus tablas ya estan (por ejemplo, porque las creo el backend anterior en
NestJS) y en ese caso no hace nada. Laravel lleva su registro en la tabla
`migraciones_laravel`, aparte de la `migrations` que usaba TypeORM.

### 8.3.1 Diagnostico de la base (`php artisan bd:verificar`)

`app/Consola/VerificarBd.php` usa la misma configuracion que la API, asi que
verifica exactamente la conexion con la que va a trabajar el backend. Imprime
cual base se eligio y por que (`DB_ORIGEN`, o que hay `DATABASE_URL`), revisa
que PHP tenga las extensiones necesarias, intenta conectar y, si lo logra,
revisa el estado del esquema: tablas faltantes, migraciones aplicadas y si la
semilla ya cargo usuarios.

Cuando falla no muestra el error crudo del driver, sino la causa y el remedio:

| Sintoma | Que significa |
|---|---|
| `Connection refused` | PostgreSQL no esta corriendo o escucha en otro puerto |
| `could not translate host name` | host mal escrito |
| `timeout expired` | firewall, o un hosting que bloquea las conexiones salientes al 5432 |
| `password authentication failed` | usuario o clave incorrectos (sugiere el `CREATE USER`) |
| `database "..." does not exist` | la base no existe (sugiere el `CREATE DATABASE`) |
| `could not find driver` | falta la extension `pdo_pgsql` de PHP |

Las imagenes del juego van en `backend/public/archivos/` (fondo en `fondos/`,
CEO en `personajes/`); ver 6.2.1 y `backend/public/archivos/README.md`. No hace
falta ninguna para que la aplicacion arranque.

Usuarios de ejemplo que deja la semilla (clave para todos: `ludus123`):

| Rol | Correo |
|---|---|
| superadmin | elena@ludus.io |
| admin_institucion (NEXUM) | marta@nexum.edu.mx |
| docente (NEXUM) | javier@nexum.edu.mx |
| estudiante (NEXUM) | sergio@nexum.edu.mx |

### 8.4 Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

En desarrollo, Vite hace proxy de `/api` y `/archivos` hacia
`http://localhost:3000` (ver `frontend/vite.config.ts`), asi que no hace falta
configurar `VITE_URL_API` salvo que el backend corra en otro host/puerto.

## 9. Ficha de diseno (heredada del prototipo)

- Tipografia: **Sora** (titulos) y **Manrope** (texto), cargadas desde
  Google Fonts.
- Iconografia: **Lucide** (`lucide-vue-next` en el frontend).
- Paleta oscura por defecto: fondo `#0E0819`, superficie `#160D2D`, acentos
  morado `#A855F7` y cian `#00E5FF`. Existe tema claro (`data-theme="light"`
  en `<html>`, alternable desde la barra superior y persistido en
  `localStorage`). Todos los tokens estan en
  `frontend/src/estilos/variables.css`.

## 10. De NestJS a Laravel: que cambio y que no

El backend se escribio primero en NestJS. Se reescribio en Laravel porque el
hosting de produccion es un cPanel compartido, que corre PHP de fabrica pero
no una aplicacion Node. La reescritura se hizo **sin perdida**: el frontend y
los paquetes SCORM ya exportados siguen funcionando sin tocar nada.

**Lo que se mantiene igual:**

- **La API**: las mismas 70 rutas, con los mismos metodos, roles, codigos de
  respuesta, mensajes de error y forma del JSON. Se verifico comparando las
  respuestas de los dos backends contra la misma base: 630 consultas GET de
  los cuatro roles y un flujo de 122 escrituras (crear, editar, inscribir,
  jugar, exportar SCORM, borrar).
- **La base de datos**: mismo esquema, mismas tablas y columnas. Una base
  creada por el backend anterior (la de Neon, por ejemplo) se usa tal cual; las
  migraciones de Laravel la detectan y no la tocan.
- **Las contrasenas**: los hashes bcrypt que genero Node se validan en PHP sin
  cambios, y los nuevos se guardan con el mismo formato (`$2b$`, costo 10).
  Nadie tiene que resetear su clave.
- **Las sesiones**: el JWT se firma igual (HS256, mismo `JWT_SECRETO`, misma
  carga, mismo `JWT_EXPIRACION`), asi que un token emitido por el backend
  anterior sigue valiendo.
- **Las variables de entorno**: las mismas (`DATABASE_URL`, `DB_ORIGEN`,
  `DB_HOST`..., `JWT_SECRETO`, `URL_PUBLICA_API`, `RUTA_ARCHIVOS`).
- **El paquete SCORM**: mismo lanzador, mismo manifiesto y mismo LEEME; el ZIP
  que genera Laravel es identico al de antes salvo el token.

**Lo que cambio (a mejor):**

- `GET /solicitudes` ahora trae el `curso` o la `ruta` de cada solicitud; antes
  llegaban vacios y la columna "Curso / ruta" de la pantalla quedaba en blanco.
- Aprobar una solicitud de **salida** ahora si da de baja al estudiante. En el
  backend anterior el borrado no encontraba la inscripcion y el estudiante
  seguia inscrito.
- Al asignar un personaje a un caso, la respuesta trae el personaje nuevo (antes
  devolvia el anterior).
- `POST /usuarios` ya no devuelve el hash de la contrasena.
- Un dato repetido (el dominio de una institucion) responde `409` y un id que
  no es UUID responde `400`, en vez de `500`.
- Los mensajes de validacion estan en espanol.

El codigo del backend en NestJS queda en el historial del repositorio, en la
etiqueta **`nest-final`** (`git checkout nest-final -- backend` lo recupera).
