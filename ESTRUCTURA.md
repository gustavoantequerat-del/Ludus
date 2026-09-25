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
├── backend/          Backend NestJS (API REST + PostgreSQL)
│   └── archivos/       Imagenes del juego (fondos y personajes); se sirve en /archivos
├── frontend/          Frontend Vue 3 (SPA)
├── project/           Prototipo original de Claude Design (referencia, no se ejecuta)
├── chats/              Transcripciones de las conversaciones de diseno (referencia)
└── ESTRUCTURA.md       Este documento
```

### 3.1 Backend (`backend/src`)

Organizado por dominio (carpeta = "modulo" de Nest = area del negocio), sin
capas transversales artificiales:

```
backend/src/
├── main.ts                     Arranque de Nest, prefijo /api, CORS, ValidationPipe global
├── app.module.ts                Modulo raiz: registra TypeORM y todos los modulos de dominio
├── configuracion/
│   ├── configuracion.ts         Lee variables de entorno (.env)
│   ├── opciones-typeorm.ts      Arma las opciones de conexion para NestJS
│   └── datos-origen.ts          DataSource de TypeORM para CLI (migraciones)
├── comun/                        Piezas transversales reutilizadas por todos los modulos
│   ├── enums/rol.enum.ts         Rol: superadmin | admin_institucion | docente | estudiante
│   ├── decoradores/              @Roles(...), @UsuarioActual()
│   ├── guardias/                 JwtGuardia (valida token), RolesGuardia (valida @Roles)
│   └── tipos/usuario-autenticado.ts
├── autenticacion/                 POST /autenticacion/ingresar, GET /autenticacion/perfil
├── instituciones/                  CRUD instituciones (solo superadmin)
├── usuarios/                       CRUD usuarios, alcance segun quien consulta
├── cursos/                          CRUD cursos + submodulos (modulos de un curso)
│   ├── curso.entidad.ts
│   └── modulo-curso.entidad.ts     "modulo" del curso (no confundir con modulo de Nest)
├── rutas/                            CRUD rutas + su relacion ordenada con cursos existentes
│   ├── ruta.entidad.ts
│   └── ruta-curso.entidad.ts        tabla puente ruta<->curso con orden
├── archivos/                          Servicio que guarda y lista las imagenes del juego
├── juegos/                            Catalogo fijo de plantillas + configuracion por modulo
│   ├── juego.entidad.ts             catalogo (se administra por semilla, no CRUD de usuario)
│   ├── configuracion-juego.entidad.ts
│   └── mesa-cumplimiento/           el juego jugable, con todo su contenido adentro
│       ├── caso-cumplimiento.entidad.ts
│       ├── casos.ts                  catalogo base que carga la migracion (semilla, no banco vivo)
│       └── personajes/               los CEO que aparecen en escena (CRUD + subida de imagen)
├── inscripciones/                    Asigna/reemplaza la lista de estudiantes de un curso o ruta
├── solicitudes/                       Ingreso/salida que pide un estudiante y resuelve un admin
├── resultados/                         Resultado de una partida (puntaje, intento, nota)
├── panel/                              Endpoints de dashboard: /panel/resumen y /panel/actividad
├── scorm/                               Exportacion de un modulo como paquete SCORM 1.2
│   ├── paquete-scorm.entidad.ts        registro del paquete (token publico, activo/revocado)
│   └── plantilla/                        archivos que se empaquetan en el ZIP (ver 6.1)
├── migraciones/                       Migraciones de TypeORM (SQL versionado)
├── semilla/semilla.ts                 Script que carga datos de ejemplo
└── herramientas/verificar-bd.ts       Diagnostico de la conexion a PostgreSQL (ver 8.3.1)
```

Cada modulo de dominio sigue siempre el mismo patron:
`*.entidad.ts` (tabla), `dto/*.dto.ts` (validacion de entrada con
class-validator), `*.service.ts` (reglas de negocio y acceso a datos),
`*.controller.ts` (rutas HTTP) y `*.module.ts` (cablea todo con Nest).

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

Hay exactamente 4 roles (`comun/enums/rol.enum.ts` en el backend):

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
  actual y la verifica con `bcrypt.compare` **antes** de guardar la nueva.
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
<token>` (JWT). Cuerpo de las peticiones validado con DTOs
(class-validator); las respuestas son JSON directo de las entidades.

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
POST     /juegos/mesa-cumplimiento/casos/duplicar-base copia el catalogo base a la institucion
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
GET      /scorm/paquetes/:id/descargar    devuelve el ZIP del paquete
PATCH    /scorm/paquetes/:id              { activo } activa o revoca el paquete
DELETE   /scorm/paquetes/:id

GET      /scorm/publico/:token            datos del modulo para la pantalla de login (sin sesion)
POST     /scorm/publico/:token/ingresar   login del estudiante desde el LMS
POST     /scorm/publico/:token/resultado  guarda el intento (requiere el token del login)
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

**Configuracion necesaria.** El ZIP lleva grabada la direccion de la API en
`configuracion.js`, tomada de la variable `URL_PUBLICA_API`. Tiene que ser una
URL alcanzable desde el navegador del estudiante: si el LMS corre en otra
maquina, `localhost` no sirve. Ese es el ajuste que hay que recordar antes de
exportar paquetes para produccion.

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

Las imagenes son **archivos, no codigo**. El backend sirve la carpeta
`RUTA_ARCHIVOS` (por defecto `backend/archivos/`) en `/archivos`, fuera del
prefijo `/api`:

| Que | Donde | Como se usa |
|---|---|---|
| Fondo de la mesa | `archivos/fondos/mesa-cumplimiento.png` | nombre fijo por convencion; si falta, la escena usa un degradado |
| Fotos de los CEO | `archivos/personajes/*.png` | cada una se registra como un personaje desde la aplicacion |

Recomendado para los CEO: PNG con fondo transparente, vertical, de medio
cuerpo y mirando al frente; maximo 3 MB. Para el fondo: apaisado, 1600x900 o
mas, con lo importante arriba y a los costados (el centro-abajo queda tapado
por el personaje y el globo). Todo esto tambien esta en
`backend/archivos/README.md`.

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

Regla de alcance, la misma que para personajes: mientras la institucion no
tenga casos propios, la mesa juega con el **catalogo base de Ludus** (que se
ve pero no se edita). El boton *Duplicar catalogo base* copia los 13 casos a
la institucion; desde esa copia, la partida se arma **solo** con los casos de
la institucion y el docente puede cambiarlos todos.

La lista muestra justamente eso: lo que van a jugar los estudiantes. Una vez
duplicado el catalogo, el base deja de listarse para no duplicar cada caso en
pantalla; el superadmin, que es quien mantiene ese catalogo, si lo ve.

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
backend (`src/juegos/mesa-cumplimiento/`), nunca en el cliente:

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

`src/juegos/mesa-cumplimiento/casos.ts` ya no es el banco en vivo: es la
**semilla** que la migracion carga como catalogo base, y donde viven las
etiquetas de los seis campos y de las tres decisiones.

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
  `PanelService.actividadReciente()` arma la lista combinando las tablas
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

### 8.1 Requisitos

- Node.js 20+
- PostgreSQL accesible (local o remoto). Este proyecto **no crea la base de
  datos**; hay que crearla antes.

### 8.2 Base de datos

```bash
# Ejemplo con un Postgres local
sudo -u postgres psql -c "CREATE USER sistema_juegos WITH PASSWORD 'sistema_juegos';"
sudo -u postgres psql -c "CREATE DATABASE sistema_juegos OWNER sistema_juegos;"
```

### 8.3 Backend

```bash
cd backend
cp .env.example .env        # ajusta las credenciales si no usaste las de arriba
npm install
npm run bd:verificar          # comprueba que la base responda antes de seguir
npm run migracion:ejecutar   # crea las tablas
npm run semilla               # carga instituciones, usuarios y datos de ejemplo
npm run start:dev             # http://localhost:3000/api
```

### 8.3.1 Diagnostico de la base (`npm run bd:verificar`)

`backend/src/herramientas/verificar-bd.ts` usa el mismo `DataSource` que las
migraciones y la aplicacion, asi que verifica exactamente la configuracion con
la que arranca el backend. Imprime la configuracion en uso (y si viene de
`.env` o de los valores por defecto), intenta conectar y, si lo logra, revisa
el estado del esquema: tablas faltantes, migraciones aplicadas y si la semilla
ya cargo usuarios.

Cuando falla no muestra el error crudo del driver, sino la causa y el remedio:

| Sintoma | Que significa |
|---|---|
| `ECONNREFUSED` | PostgreSQL no esta corriendo o escucha en otro puerto |
| `ENOTFOUND` / `EAI_AGAIN` | `DB_HOST` mal escrito |
| `ETIMEDOUT` | firewall o base remota inalcanzable |
| `28P01` / `28000` | usuario o clave incorrectos (sugiere el `CREATE USER`) |
| `3D000` | la base no existe (sugiere el `CREATE DATABASE`) |

No hay nada que "refrescar": el backend abre el pool al arrancar, asi que
despues de corregir `.env` o de levantar PostgreSQL hay que reiniciar
`npm run start:dev`.

Las imagenes del juego van en `backend/archivos/` (fondo en `fondos/`, CEO en
`personajes/`); ver 6.2.1 y `backend/archivos/README.md`. No hace falta
ninguna para que la aplicacion arranque.

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

En desarrollo, Vite hace proxy de `/api` hacia `http://localhost:3000`
(ver `frontend/vite.config.ts`), asi que no hace falta configurar
`VITE_URL_API` salvo que el backend corra en otro host/puerto.

## 9. Ficha de diseno (heredada del prototipo)

- Tipografia: **Sora** (titulos) y **Manrope** (texto), cargadas desde
  Google Fonts.
- Iconografia: **Lucide** (`lucide-vue-next` en el frontend).
- Paleta oscura por defecto: fondo `#0E0819`, superficie `#160D2D`, acentos
  morado `#A855F7` y cian `#00E5FF`. Existe tema claro (`data-theme="light"`
  en `<html>`, alternable desde la barra superior y persistido en
  `localStorage`). Todos los tokens estan en
  `frontend/src/estilos/variables.css`.
