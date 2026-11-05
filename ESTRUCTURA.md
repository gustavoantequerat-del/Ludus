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
- **Solo juegos programados.** El prototipo dejo la mecanica de juego fuera
  a proposito e inventaba seis plantillas de maqueta. Hoy el catalogo tiene
  solo los juegos con mecanica real: **Mesa de Cumplimiento** (contenido
  del curso de Cripto Compliance, ver 6.2), el **Runner Narrativo**
  (historias en video, ver 6.3.4), el **Ajedrez de Preguntas** (ver 6.5) y
  los ludicos **Memorama** y **Mahjong** (ver 6.3). Las maquetas (Viborita Numerica, Torre de Bloques,
  Burbujas, Ordena la Secuencia y Laberinto) se quitaron con la migracion
  `QuitarJuegosMaqueta`: los modulos que las usaban quedan "sin juego" hasta
  que el docente les asigne uno. El sector de cada juego (evaluacion o
  ludico) lo dice `tipo`.
- **Alta masiva por Excel**, **registro de accesos** e integraciones
  opcionales de **Google** (inicio de sesion y Analytics), ver 6.4 y
  `GOOGLE.md`.
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
├── ESTRUCTURA.md       Este documento
└── DESPLIEGUE.md        Como subirlo a cPanel, o a Neon + Vercel
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
│   ├── conexion-bd.ts            Decide DATABASE_URL vs variables sueltas segun DB_ORIGEN (ver 8.2.1)
│   ├── opciones-typeorm.ts      Arma las opciones de conexion para NestJS
│   └── datos-origen.ts          DataSource de TypeORM para CLI (migraciones)
├── comun/                        Piezas transversales reutilizadas por todos los modulos
│   ├── enums/rol.enum.ts         Rol: superadmin | admin_institucion | docente | estudiante
│   ├── decoradores/              @Roles(...), @UsuarioActual()
│   ├── guardias/                 JwtGuardia (valida token), RolesGuardia (valida @Roles)
│   ├── filtros/errores-bd.filtro.ts  Errores de PostgreSQL del cliente -> 400/409 (no 500)
│   ├── validacion/errores-validacion.ts  Mensajes de validacion en espanol
│   ├── utilidades/azar.ts        mezclar() y alAzar() sin sesgo (crypto.randomInt + Fisher-Yates) para las preguntas
│   └── tipos/usuario-autenticado.ts
├── autenticacion/                 Login con clave o con Google, registro de estudiantes con codigo, perfil, opciones publicas
│   └── limite-intentos.ts           Limite en memoria de codigos equivocados por IP (10 cada 15 min)
├── accesos/                        Registro de cada inicio de sesion (quien, cuando, por donde) y su listado
├── instituciones/                  CRUD instituciones (solo superadmin) y su codigo de registro (superadmin y su admin)
│   └── codigo-registro.ts           Genera y normaliza el codigo (8 caracteres sin 0/O/1/I/L, se muestra ABCD-EFGH)
├── usuarios/                       CRUD usuarios, alcance segun quien consulta
│   └── importacion/                 Alta masiva desde .xlsx: plantilla, lectura y validacion por fila
├── cursos/                          CRUD cursos + submodulos (modulos de un curso)
│   ├── curso.entidad.ts
│   └── modulo-curso.entidad.ts     "modulo" del curso (no confundir con modulo de Nest)
├── rutas/                            CRUD rutas + su relacion ordenada con cursos existentes
│   ├── ruta.entidad.ts
│   └── ruta-curso.entidad.ts        tabla puente ruta<->curso con orden
├── archivos/                          Guarda y sirve las imagenes de los juegos (los videos no: son links)
├── juegos/                            Catalogo fijo de plantillas + configuracion por modulo
│   ├── juego.entidad.ts             catalogo (semilla/migracion, no CRUD); tipo: evaluacion | ludico
│   ├── configuracion-juego.entidad.ts  parametros genericos + ajustes (jsonb) propios de cada juego
│   ├── acceso-modulo.service.ts     quien ve/configura el juego de un modulo (lo usan todos los juegos)
│   ├── catalogo-nuevos.ts           datos de catalogo de Memorama, Mahjong y Runner (migracion y semilla)
│   ├── fichas/                      Memorama y Mahjong: mazos (iconos, ficha, fondo) y su partida
│   ├── runner/                      Runner Narrativo: historias con links de video, partida y calificacion
│   │   └── videos-externos.ts        reconoce y normaliza links de YouTube y Google Drive
│   ├── ajedrez/                     Ajedrez de Preguntas: bancos de preguntas, partida (preguntas y nota en el servidor)
│   │   └── banco-base.ts             banco de ejemplo que carga la migracion
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
├── main.ts                    Monta la app, importa los estilos globales, engancha Analytics al enrutador
├── App.vue                    Decide si mostrar el layout con barra o la pantalla de login
├── vite-env.d.ts               Tipos de Vite + modulos *.vue y *.module.css
├── estilos/
│   ├── variables.css           Tokens de diseno (colores, tipografia) en :root, tema claro/oscuro
│   └── base.css                 Reset minimo de HTML/body/scroll y la regla global de "menos movimiento"
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
│   ├── errores.ts                  Saca el mensaje que manda el backend cuando rechaza algo
│   ├── catalogo.ts                 Los dos sectores del catalogo (evaluacion / ludico)
│   ├── partidas.ts                 Registrar el intento de un juego ludico, formato de tiempo
│   ├── azar.ts                      Mezclar una lista (Fisher-Yates; lo usan el Memorama y el Mahjong)
│   ├── opciones.ts                  Pide una vez al backend los ids publicos de Google
│   ├── videos.ts                    Links de YouTube/Drive (igual que el backend), iframe y API de YouTube
│   ├── ajedrez/motor.ts             Reglas del ajedrez con capturas que pueden fallar (sin Vue: se compila para SCORM)
│   ├── ajedrez/bot.ts               Bot intermedio: alfa-beta pseudo-legal con profundizacion (hasta 3 jugadas, tope 0,9 s)
│   ├── ajedrez/bot.worker.ts        El bot en un Web Worker: la pagina no se congela mientras piensa
│   ├── ajedrez/pensar.ts            Pide la jugada al Worker (y si no hay Worker, la calcula en la pagina)
│   ├── ajedrez/capturas.ts          Que pregunta sale en cada captura, sus avisos y su resultado (compartido con SCORM)
│   ├── ajedrez/piezas-animadas.ts   Identidad de cada pieza entre jugadas, para animar deslizamientos y caidas
│   ├── ajedrez/scorm-entrada.ts     Entrada de `npm run ajedrez:scorm` (genera ajedrez-motor.js del paquete)
│   ├── analitica.ts                 Google Analytics 4 opcional: vistas por ruta, user_id sin datos personales
│   └── google.ts                    Boton "Continuar con Google" (Google Identity Services)
├── componentes/
│   ├── base/                     Piezas de UI genericas y reutilizables (Boton, Modal, Tabla, ...)
│   ├── diseno/                    Layout de la aplicacion (BarraSuperior, BarraLateral, EsqueletoApp)
│   ├── editor/                     Pestanas del editor de cada juego (Casos, Personajes, Mazos, Historias, CampoLinkVideo, EditorAjedrez)
│   ├── configuracion/              Parametros propios de cada juego al configurar un modulo
│   ├── usuarios/                    ImportarUsuarios: modal de alta masiva por Excel (plantilla, vista previa, confirmar)
│   ├── instituciones/               CodigoRegistro: ver, copiar (codigo o enlace) y renovar el codigo de registro
│   └── juegos/                     Los juegos jugables (MesaCumplimiento, Memorama, Mahjong, RunnerNarrativo, Ajedrez)
│       ├── ReproductorVideo.vue      video de YouTube (API, avanza solo) o de Drive (iframe + "Continuar")
│       ├── mahjong/tablero.ts        logica pura del Mahjong: disposiciones, fichas libres, reparto con solucion
│       └── ajedrez/                  Tablero, PiezaAjedrez (6 figuras SVG propias) y TarjetaPregunta
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

La unica excepcion son los valores que llegan del servidor o dependen de la
partida: el fondo de la escena, la imagen del mazo o la posicion de cada ficha
del Mahjong. La vista solo define variables CSS (`--fondo-escena`,
`--fondo-mesa`, `--dorso`, `--x`/`--y`/`--z`) y todas las reglas visuales
siguen viviendo en el archivo `.module.css`.

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

institucion 1───* mazo (iconos, ficha y fondo del Memorama o del Mahjong; null = catalogo base)
institucion 1───* historia (intro y preguntas en video del Runner Narrativo; null = catalogo base)
configuracion_juego.ajustes ──> mazo o historia (por id, dentro del jsonb)

usuario 1───* acceso (cada inicio de sesion: metodo clave/google/scorm, IP, navegador)

institucion 1───* banco_ajedrez (preguntas de 4 opciones, minutos, minimo X; null = catalogo base)
usuario(estudiante) 1───* partida_ajedrez (preguntas que dio el servidor y como se respondieron)
configuracion_juego.ajustes ──> banco_ajedrez (por id, dentro del jsonb)
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
- **juego** es un catalogo fijo de plantillas que cargan la semilla y las
  migraciones. No tiene CRUD de usuario porque, segun la definicion del
  negocio, las plantillas las programa el equipo de desarrollo; los roles con
  permiso solo las **seleccionan y configuran** por modulo. Cada plantilla es
  de uno de dos **sectores** (`juego.tipo`):
  - **evaluacion**: mide lo aprendido en el curso y puede calificar (Mesa de
    Cumplimiento, Runner Narrativo y Ajedrez de Preguntas). Su puntaje lo
    calcula el servidor.
  - **ludico**: para jugar sin saber el tema; **nunca califica** (Memorama y
    Mahjong). Al configurar un juego ludico el modulo queda con
    `califica = false` aunque antes calificara.
- **configuracion_juego** guarda los parametros genericos (velocidad, tiempo,
  pares, intentos, puntaje) y en `ajustes` (jsonb) lo propio de cada juego: el
  mazo y las rondas del Memorama, el mazo y el tamano del Mahjong, la historia
  del Runner. Cada juego valida sus ajustes al configurar y descarta lo que no
  reconoce.
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

El docente de un curso lo elige el superadmin o el admin de la institucion:
al crear el curso, o despues con **Asignar docente** en el detalle del curso
(solo docentes activos de la institucion del curso). Un docente que crea un
curso queda como su docente.
| `estudiante` | Pide inscripcion/salida, cursa lo que tiene asignado, juega, ve sus resultados. |

Pantallas (una vista de Vue por cada una, ver `frontend/src/vistas/`):

| Vista | Ruta | Quien la ve |
|---|---|---|
| `LandingVista` | `/bienvenida` (y `/` sin sesion) | publica: que es Ludus, sus juegos y el registro de estudiantes |
| `AutenticacionVista` | `/ingresar` | publica |
| `PanelVista` (dashboard) | `/` | todos, contenido distinto por rol |
| `InstitucionesVista` | `/instituciones` | superadmin |
| `UsuariosVista` | `/usuarios`, `/docentes`, `/estudiantes` | superadmin, admin_institucion, docente (solo lectura); "Importar Excel" para los dos primeros |
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
| `AccesosVista` | `/accesos` | superadmin (todos), admin_institucion (su institucion) |
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

### 5.2 Cuentas protegidas y recuperar el superadmin

Para que nadie se quede afuera, el backend (`UsuariosService`) bloquea:

- **Eliminar a un superadministrador**, incluido uno mismo.
- Quitarle el rol o **desactivar** a un superadministrador.
- Que cualquier usuario se elimine, se desactive o se cambie el rol a si mismo.

La pantalla de usuarios no muestra la papelera en esas cuentas y al editarlas
solo deja cambiar nombre y correo. El superadmin puede crear otros
superadmins desde *Usuarios > Nuevo usuario* (rol "Superadministrador", sin
institucion).

Si aun asi no queda ningun superadmin con acceso (por ejemplo, una cuenta
borrada antes de este bloqueo, o una clave olvidada), en el servidor:

```bash
cd ~/ludus/backend
npm run superadmin:crear -- tu-correo@dominio.com "Nombre Apellido"
```

Usa el mismo `.env` que el backend (la misma base). Si el correo no existe lo
crea como superadmin; si existe, lo convierte en superadmin, lo reactiva y le
pone una clave nueva. La clave temporal se muestra una sola vez y se cambia
en "Mi perfil". No toca ningun otro dato.

### 5.3 Avisos de error y logs

- **En pantalla**: si una accion falla y la vista no lo maneja, aparece el
  mensaje del servidor ("Ya existe un usuario con ese correo", "El dominio
  ... ya es de la institucion ...") durante 6 segundos
  (`utilidades/avisos-de-error.ts`). El detalle queda en la consola del
  navegador con el prefijo `[Ludus]`. Un 401 no se avisa: es la sesion
  vencida y se vuelve al login. Los formularios que guardan (usuarios,
  cursos, rutas, detalle del curso) dejan el modal abierto para corregir.
- **En el servidor**: `RegistroErroresFiltro` deja una linea por cada
  peticion que termina en error, con quien la hizo y el motivo:

  ```
  WARN [Errores] 409 POST /api/usuarios · elena@ludus.io (superadmin) · Ya existe un usuario con ese correo
  WARN [Errores] 401 POST /api/autenticacion/ingresar · intento con marta@nexum.edu.mx · Correo o contrasena invalidos
  ERROR [Errores] 500 GET /api/... · ... · <mensaje>  (con la traza completa)
  ```

  4xx (dato invalido, repetido, sin permiso, clave equivocada) va como WARN;
  5xx (fallo del servidor) como ERROR con la traza. En los logins fallidos se
  anota el correo, nunca la clave.

## 6. API (resumen)

Todo bajo el prefijo `/api`. Autenticacion con `Authorization: Bearer
<token>` (JWT). Cuerpo de las peticiones validado con DTOs
(class-validator); las respuestas son JSON directo de las entidades.

```
POST   /autenticacion/ingresar          { correo, clave } -> { tokenAcceso, usuario }
POST   /autenticacion/google            { credencial: ID token de Google } -> { tokenAcceso, usuario }; 503 si no hay GOOGLE_CLIENT_ID
GET    /autenticacion/opciones          publico: { googleClientId, googleAnalyticsId } (null si no estan configurados)
POST   /autenticacion/registro          publico: { nombre, correo, clave, codigo } -> { tokenAcceso, usuario, institucion }; siempre estudiante; 429 tras 10 codigos malos por IP
GET    /autenticacion/perfil
PATCH  /autenticacion/perfil            { nombre?, correo? } -> { tokenAcceso, usuario }
PATCH  /autenticacion/clave             { claveActual, claveNueva } -> 204

GET|POST /instituciones                 superadmin
GET|PATCH|DELETE /instituciones/:id     superadmin
GET|POST /instituciones/:id/codigo-registro  superadmin o el admin de esa institucion; POST lo renueva (el anterior deja de servir)

GET|POST /usuarios                      alcance segun rol; ?rol= filtra; un superadmin crea superadmins
GET      /usuarios/plantilla            .xlsx de ejemplo para la importacion (superadmin/admin)
POST     /usuarios/importar             cuerpo = el .xlsx crudo; sin ?confirmar=true solo devuelve la vista previa
GET|PATCH|DELETE /usuarios/:id

GET      /accesos?dias=30               inicios de sesion + resumen (superadmin todos, admin su institucion)

GET|POST /cursos                        alcance segun rol; superadmin indica institucionId; docenteId debe ser docente de esa institucion
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

GET|POST /juegos/mazos?juego=memorama|mahjong   mazos propios + el base (superadmin/admin/docente)
POST     /juegos/mazos/imagenes                 { imagen: dataURL, uso: icono|ficha|fondo } -> { ruta }
POST     /juegos/mazos/:id/duplicar             copia (por ejemplo el base) a la institucion
PATCH|DELETE /juegos/mazos/:id                  no se borra si un modulo lo usa
GET      /juegos/memorama/partida/:moduloId     mazo, rondas, pares por ronda y ms de volteo
GET      /juegos/mahjong/partida/:moduloId      mazo y tamano del tablero

GET|POST /juegos/runner-narrativo/historias      los videos son links de YouTube o Drive; un link de otro sitio -> 400
PUT|DELETE /juegos/runner-narrativo/historias/:id  PUT reemplaza la historia entera, con sus preguntas en orden
GET      /juegos/runner-narrativo/partida/:moduloId           historia sin respuestas ni videos de reaccion
POST     /juegos/runner-narrativo/partida/:moduloId/verificar { preguntaId, opcionId } -> { correcta, video: { fuente, id } | null }
POST     /juegos/runner-narrativo/partida/:moduloId/terminar  { respuestas } -> nota (solo estudiante)

GET|POST /juegos/ajedrez/bancos                 bancos de preguntas (superadmin/admin/docente)
PUT|DELETE /juegos/ajedrez/bancos/:id           PUT reemplaza el banco; no se borra si un modulo lo usa
POST     /juegos/ajedrez/partida/:moduloId                         empieza una partida (solo estudiante)
POST     /juegos/ajedrez/partida/:moduloId/:partidaId/pregunta     { modo: normal | rey | critica } -> pregunta sin la correcta
POST     /juegos/ajedrez/partida/:moduloId/:partidaId/responder    { preguntaId, opcionId } -> { correcta, respondidas, correctas }
POST     /juegos/ajedrez/partida/:moduloId/:partidaId/terminar     { desenlace } -> modo examen (faltan N) o la nota

GET|PUT  /cursos/:cursoId/inscripciones   reemplaza la lista completa de estudiantes
GET|PUT  /rutas/:rutaId/inscripciones

GET|POST /solicitudes                     crear: solo estudiante
PATCH    /solicitudes/:id                 { estado: 'aprobada' | 'rechazada' }; solo admin/superadmin

GET|POST /resultados                      crear: solo estudiante y solo en juegos ludicos (los de evaluacion califican en el servidor)

GET      /panel/resumen                   KPIs segun el rol de quien consulta
GET      /panel/actividad                 solo superadmin

GET|POST /scorm/paquetes                  paquetes exportados (superadmin/admin/docente)
GET      /scorm/diagnostico               a que URL apuntan los paquetes y si esa URL sirve
GET      /scorm/paquetes/:id/descargar    devuelve el ZIP del paquete
PATCH    /scorm/paquetes/:id              { activo } activa o revoca el paquete
DELETE   /scorm/paquetes/:id

GET      /scorm/publico/:token            datos del modulo para la pantalla de login (sin sesion)
POST     /scorm/publico/:token/ingresar   login del estudiante desde el LMS
GET      /scorm/publico/:token/partida   partida del juego del modulo (Mesa, Memorama, Mahjong o Runner)
POST     /scorm/publico/:token/runner/verificar  { preguntaId, opcionId } -> { correcta, video }
POST     /scorm/publico/:token/runner/terminar   { respuestas } -> nota + lo que se reporta al LMS
POST     /scorm/publico/:token/ajedrez[/:partidaId/pregunta|responder|terminar]  lo mismo que la partida de Ludus
POST     /scorm/publico/:token/resultado  guarda el intento de un juego ludico (requiere el token del login)
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

Fue el primer juego del catalogo con mecanica real. Esta inspirado en *That's Not My Neighbor*: en vez de dejar pasar
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
backend (`src/juegos/mesa-cumplimiento/`), nunca en el cliente:

- `GET /juegos/partida/:moduloId` entrega los expedientes **sin** la respuesta
  correcta (con el personaje y el fondo de la escena); la cantidad sale de
  `paresContenido` de la configuracion.
- `POST /juegos/partida/verificar` devuelve el veredicto de un caso, para dar
  retroalimentacion inmediata con la regla del curso.
- `POST /juegos/partida/:moduloId/terminar` recalcula la nota en el servidor a
  partir de las respuestas y registra el intento como cualquier otro resultado.

El catalogo de juegos tiene ahora `clave` (identificador estable) y `jugable`.
El frontend y el paquete SCORM usan esa clave para decidir que juego
renderizar, asi que agregar un juego nuevo no exige tocar los existentes.

`src/juegos/mesa-cumplimiento/casos.ts` ya no es el banco en vivo: es la
**semilla** que la migracion carga como catalogo base, y donde viven las
etiquetas de los seis campos y de las tres decisiones.

**Dentro del LMS.** El paquete SCORM ejecuta exactamente el mismo juego, con la
misma escena, consumiendo los endpoints publicos equivalentes con el token del
paquete. Las imagenes se piden al servidor de Ludus con URL absoluta (derivada
de `URL_PUBLICA_API`), porque el paquete corre en el dominio del LMS. La nota
que llega al LMS es la calculada por el servidor.

## 6.3 Juegos ludicos y Runner Narrativo

### 6.3.1 Memorama (ludico)

Se voltean dos fichas por turno buscando parejas. Se juega por **rondas**: cada
ronda saca al azar `pares por ronda` iconos del mazo y arma un tablero nuevo.

Lo que configura el docente en el modulo:

| Parametro | Donde se guarda | Valores |
|---|---|---|
| Mazo | `ajustes.mazoId` | uno propio o el base; sin mazo valido se juega con el base |
| Rondas | `ajustes.rondas` | 1 a 5 |
| Pares por ronda | `pares_contenido` | 4 a 12, y nunca mas que los iconos del mazo |
| Velocidad de volteo | `velocidad` | lenta 1,6 s / normal 1 s / rapida 0,55 s: cuanto quedan a la vista dos fichas que no son pareja |

El puntaje (sin nota) es `100 x parejas / movimientos`: 100 si cada pareja
salio al primer intento.

### 6.3.2 Mahjong (ludico)

Mahjong solitario: se retiran de a dos las fichas **libres** con el mismo icono.
Una ficha esta libre si no tiene otra encima y le queda un costado (izquierdo
o derecho) sin tapar. Tres tamanos de tablero (`ajustes.tamano`): pequeno (36
fichas), mediano (80) y grande (108), en piramides de capas definidas en
`componentes/juegos/mahjong/tablero.ts`.

- **Siempre tiene solucion al empezar.** El reparto se hace "jugando al reves":
  desde el tablero lleno se toman dos fichas libres, se les pone el mismo icono
  y se sacan. Ese orden es una forma valida de vaciarlo.
- **Barajar** reparte de nuevo lo que queda, otra vez con solucion. Si lo que
  queda no tiene salida con ningun reparto (por ejemplo dos fichas apiladas),
  el juego lo dice y ofrece terminar, en vez de barajar sin fin.
- **Pista** resalta una pareja libre.
- Puntaje (sin nota): la parte del tablero que se vacio, menos 5 por barajada.

### 6.3.3 Mazos: el aspecto del Memorama y del Mahjong

Un mazo (`mazos`) tiene **iconos** (minimo 4, maximo 60), una **imagen de
ficha** y un **fondo** de mesa. En el Memorama la imagen de ficha es el dorso
de la carta; en el Mahjong, el cuerpo de la pieza sobre el que va el icono. Sin
imagen, cada juego dibuja la suya.

- Hay un mazo base por juego ("Clasico", 24 iconos en `archivos/fichas/base/`,
  hechos con Lucide). Solo el superadmin lo edita; los demas lo **duplican** y
  cambian la copia.
- Las imagenes se suben de a una (`POST /juegos/mazos/imagenes`) y el mazo
  guarda sus rutas: un mazo de 24 imagenes no entra en una peticion de 6 MB.
  PNG, JPG o WEBP de hasta 3 MB.
- Lo que se sube y deja de usarse se borra del disco al guardar o borrar el
  mazo. Un mazo que usa algun modulo no se puede borrar.

### 6.3.4 Runner Narrativo (evaluacion)

Una historia en video que avanza pregunta por pregunta. No hay personaje
programado: el docente arma la cadena con **links a sus videos en YouTube o
Google Drive**. Ludus no guarda ni sirve video: el almacenamiento y el
streaming quedan del lado de Google.

```
Intro ──> Pregunta 1 ──acierta──> video bueno ──> Pregunta 2 ──> ... ──> video bueno final ──> gana
                     └─falla───> video malo ──> fin de la partida
```

- Cada pregunta tiene una respuesta correcta, una incorrecta, el video si
  acierta y el video si falla. El estudiante ve las dos respuestas en orden al
  azar.
- La historia puede ser tan larga como se quiera (hasta 100 preguntas); el
  orden de la lista es el orden de juego.
- **Videos por link** (`juegos/runner/videos-externos.ts`). Se aceptan los
  links de YouTube (`watch?v=`, `youtu.be/`, `shorts/`, `embed/`) y de Drive
  (`/file/d/ID/...`, `open?id=`). Se guardan normalizados
  (`https://www.youtube.com/watch?v=ID` o `https://drive.google.com/file/d/ID/view`)
  y al jugar se entregan como `{ fuente: 'youtube' | 'drive', id }`. Un link
  de otro sitio se rechaza al guardar. El editor dice de que servicio es cada
  link y deja probar el video ahi mismo.
- **YouTube avanza solo; Drive con "Continuar".** Con YouTube se usa su API
  de iframe, que avisa cuando el video termina. El reproductor de Drive es un
  iframe cerrado que no avisa nada, asi que debajo aparece "Continuar". Si la
  API de YouTube no carga (bloqueador de anuncios, red), el video se muestra
  en un iframe simple con "Continuar": la partida nunca queda trabada.
- **Lo que Ludus ya no puede revisar**: la duracion del video y si el link es
  publico. En Drive el archivo tiene que estar compartido como "Cualquier
  persona con el enlace" (y una institucion con Google Workspace puede tener
  bloqueado compartir hacia afuera); en YouTube, como "No listado" o publico.
  Drive ademas limita un archivo que se reproduce muchas veces seguidas.
- **Nada se puede adivinar mirando la red**: la partida llega sin decir cual
  opcion es la buena (las opciones tienen ids al azar) y sin los videos de
  reaccion. Cada respuesta se verifica en el servidor, que recien ahi entrega
  el video que corresponde. La nota tambien se calcula alla: cuenta las
  respuestas buenas, en orden, hasta el primer error. Puntaje = parte de la
  historia recorrida (1 de 2 = 50, nota 5.0).
- Si a una pregunta le falta el link, se muestra un cartel ("Correcto!" /
  "Incorrecto") unos segundos y la historia sigue.

### 6.3.5 En SCORM

Los tres se exportan a SCORM igual que la Mesa de Cumplimiento y se juegan
dentro del LMS con las mismas reglas:

- El paquete trae un archivo por juego (`scorm/plantilla/juego-memorama.js`,
  `juego-mahjong.js`, `juego-runner.js`). El lanzador (`ludus-scorm.js`) se
  encarga de la sesion y del LMS, deja lo comun en `window.LudusComun` y le
  pasa el control al juego que se registro en `window.LudusJuegos` con la
  clave del modulo.
- `GET /scorm/publico/:token/partida` devuelve la partida del juego que tenga
  el modulo. El Memorama y el Mahjong guardan el intento con
  `POST /scorm/publico/:token/resultado` y el LMS recibe `completed` (no
  califican). El Runner verifica cada respuesta con
  `POST /scorm/publico/:token/runner/verificar` y termina con
  `.../runner/terminar`: la nota sale de Ludus y el LMS recibe `passed` (60 o
  mas) o `failed`.
- Las imagenes se siguen sirviendo desde Ludus y los videos desde YouTube o
  Drive (`juego-runner.js` hace lo mismo que `ReproductorVideo.vue`): el
  paquete solo lleva el codigo, asi que un mazo o una historia editados despues de exportar
  se ven en el LMS sin volver a exportar.
- El Mahjong del paquete es una copia en JavaScript simple de
  `mahjong/tablero.ts`: si cambian las reglas, hay que cambiar los dos.

### 6.3.6 Sobrantes

Las imagenes que se suben y nunca se guardan en un mazo (por ejemplo, se
cancela el editor) quedan en el disco. Ocupan poco; no hay
limpieza automatica de esos sobrantes.

## 6.4 Alta masiva, accesos y Google

### 6.4.1 Importar usuarios desde Excel

En **Usuarios** (superadmin), **Estudiantes** y **Docentes** (admin de
institucion) esta el boton **Importar Excel**. El modal tiene dos pasos:

1. **Descargar la plantilla** (`GET /usuarios/plantilla`). Es un .xlsx real
   generado con `exceljs`: hoja `Usuarios` con las columnas `nombre`,
   `correo`, `clave`, `rol` (lista desplegable) y, solo para el superadmin,
   `institucion`; hoja `Instrucciones`; y para el superadmin una hoja
   `Instituciones` con los nombres y dominios validos.
2. **Subir el archivo lleno.** El frontend manda el archivo crudo
   (`Content-Type` de xlsx, tope 2 MB) y el backend devuelve una **vista
   previa**: cada fila con sus errores. No se crea nada hasta que se
   confirma; al confirmar se crean **solo las filas sin errores**, en una
   transaccion, y el resto se informa como omitido.

Reglas de cada fila (`usuarios/importacion/`):

- Encabezados sin importar mayusculas ni acentos; filas vacias se ignoran;
  maximo 500 filas por archivo (cada clave se cifra con bcrypt, ~75 ms cada
  una: 500 filas tardan cerca de un minuto).
- `nombre` 2 a 120 caracteres; `clave` 6 a 72 (un numero escrito en la celda
  se lee como texto); `correo` valido, se guarda en minusculas, y no puede
  existir ya (sin importar mayusculas) ni repetirse dentro del archivo.
- `rol` vacio = estudiante. Un admin de institucion importa docentes y
  estudiantes de su institucion (la columna `institucion` se ignora). El
  superadmin puede importar tambien `admin_institucion` y la institucion de
  cada fila se busca por dominio o por nombre. Superadmins no se importan.
- Un correo que Excel guardo como hipervinculo se lee igual.

### 6.4.2 Registro de accesos

Cada inicio de sesion exitoso guarda una fila en `accesos`: usuario, metodo
(`clave`, `google` o `scorm`), IP (la de `X-Forwarded-For` cuando hay un
proxy como Caddy) y navegador. Si guardar falla, el login no falla (solo
queda en el log). La vista **Accesos** muestra los ultimos 500 del periodo
elegido y un resumen (ultimas 24 h, total y cuentas distintas). Es el dato de
"que cuenta entro y cuando" que Google Analytics no puede guardar.

### 6.4.3 Google: inicio de sesion y Analytics (opcionales)

Los dos se activan con variables del backend, sin recompilar el frontend: el
frontend las pide a `GET /autenticacion/opciones` al arrancar.

- **`GOOGLE_CLIENT_ID`** muestra el boton "Continuar con Google" en el login.
  Google entrega un ID token firmado; el backend lo verifica con
  `google-auth-library` contra ese client id, exige `email_verified` y busca
  una cuenta **existente y activa** con ese correo. No hay autoregistro:
  quien no fue dado de alta recibe "No hay una cuenta activa de Ludus para
  ...". Si el script de Google no carga, el boton simplemente no aparece.
- **`GOOGLE_ANALYTICS_ID`** carga GA4 (`utilidades/analitica.ts`). Manda una
  vista por cada cambio de ruta (el titulo es el nombre de la ruta, asi
  "curso-detalle" se agrupa), el evento `login`, el `user_id` = id interno de
  Ludus y las propiedades `rol` e `institucion_id`. **Nunca** correo ni
  nombre: las condiciones de Google lo prohiben.

Los pasos para crear el client id y la propiedad de Analytics estan en
**GOOGLE.md**.

## 6.5 Ajedrez de Preguntas (evaluacion)

Ajedrez normal contra un bot (el estudiante juega con blancas), con una
diferencia: **toda captura se decide con una pregunta** de cuatro opciones.
Si el estudiante acierta, su pieza sobrevive; si falla, la que muere es la
suya, haya atacado o defendido.

| Choque | Pregunta | Si acierta | Si falla |
|---|---|---|---|
| Pieza del estudiante captura | cualquiera del banco | captura | pierde su pieza; la otra se queda |
| Pieza del bot captura | cualquiera del banco | su pieza sobrevive, cae la del bot | pierde su pieza |
| **Rey del estudiante** captura | dificil (critica, con aviso; se puede elegir otra jugada) | captura | **su rey cae: pierde la partida** |
| **Rey del bot** captura | dificil | el rey del bot cae: **gana** | pierde su pieza |
| Estudiante captura el **rey expuesto** del bot | dificil, con aviso | captura el rey: **gana** | pierde su pieza |
| El bot captura el **rey expuesto** del estudiante | dificil (critica, con aviso) | su rey sobrevive, cae la pieza del bot | **su rey cae: pierde la partida** |

Si el docente no marco preguntas dificiles, en esos casos sale cualquiera.

**Fin de la partida y nota.** Termina por mate (en cualquier sentido), por
tiempo (si el banco tiene minutos), por tablas (ahogado o solo reyes, o rey y
una pieza menor), por rendicion o por un rey caido. En todos los casos la
**nota es la parte de preguntas respondidas bien** (4 de 6 = 67, nota 6.7):
ganarle al bot solo termina la partida, y la dificultad del bot no decide
nada. Si salieron menos de **X** preguntas (minimo del banco, 5 por defecto),
la partida pasa a **modo examen**: preguntas sueltas hasta completar X, y la
nota sale de todas.

**El servidor manda en todo lo que define la nota.** El tablero y el bot
corren en el navegador, pero cada pregunta la elige el servidor (primero las
que no salieron en la partida; cuando se agotan, se repiten sin repetir la
anterior), la corrige sin revelar la correcta (las preguntas se repiten) y
lleva el tiempo (con 15 s de gracia). Tras fallar una critica no da mas
preguntas de juego. La nota se calcula con lo registrado en
`partidas_ajedrez`; una pregunta pedida y nunca respondida no cuenta. El
puntaje enviado por el navegador (`POST /resultados`) no se acepta para este
juego.

**Reglas del motor** (`utilidades/ajedrez/motor.ts`): enroque, captura al
paso, coronacion a dama (siempre a dama, para no frenar el juego), jaque,
mate y ahogado. Esta verificado con "perft" contra posiciones de referencia
del ajedrez (inicial a 4 jugadas = 197.281 posiciones, Kiwipete a 3 =
97.862). Una captura fallida puede dejar expuesto al rey de quien ataco (en
jaque cuando no es su turno). Ese rey **se puede capturar**, con pregunta:
si el estudiante la acierta contra el rey del bot, gana; si el bot ataca el
rey del estudiante, es una pregunta critica. En el juego normal un rey nunca
queda expuesto, y si estas en jaque solo puedes jugar para salir de el.

**Bot** (`utilidades/ajedrez/bot.ts`): negamax con poda alfa-beta sobre
jugadas pseudo-legales (una jugada ilegal se descubre sola porque el rival
podria comerse el rey), con profundizacion de a una jugada hasta 3 y un tope
de 0,9 s; material y tablas de posicion, y elige al azar entre las jugadas
casi igual de buenas. Juega como si sus capturas siempre salieran bien.
Tarda unos 15-40 ms por jugada (antes 80-290 ms) y en Ludus piensa en un
**Web Worker** (`bot.worker.ts`), asi que la pagina nunca se congela.

**Animaciones**: las piezas se deslizan entre casillas, la que cae se
desvanece girando, la casilla de la captura destella en verde o rojo segun la
respuesta, el rey en jaque late y la tarjeta de la pregunta entra con un
rebote, se sacude si fallas y brilla si aciertas. Todo respeta "reducir
movimiento" del sistema.

**Editor** (Editor > Ajedrez de Preguntas > Bancos de preguntas): cada banco
tiene sus preguntas (texto, cuatro opciones, la correcta y la marca de
dificil), los minutos de la partida (0 = sin limite) y el minimo X. Un banco
se puede guardar a medio armar; para elegirlo en un modulo necesita al menos
10 preguntas y al menos X. La migracion carga un banco de ejemplo en el
catalogo base.

**Piezas**: seis figuras SVG propias (`PiezaAjedrez.vue`), las mismas para
los dos bandos; el color lo pone el CSS. No hay imagenes que descargar.

**SCORM**: el paquete trae `ajedrez-motor.js` (generado desde `motor.ts` y
`bot.ts` y `capturas.ts` con `npm run ajedrez:scorm` en `frontend/`: no se
edita a mano) y `juego-ajedrez.js`, que usa esas mismas reglas de captura. Si se cambian las reglas o el bot, hay que regenerar ese
archivo. La nota sale de Ludus y el LMS recibe `passed` o `failed`.

## 6.6 Azar de las preguntas

Cada estudiante (y cada partida) recibe las preguntas en otro orden, y las
opciones de cada pregunta cambian de lugar cada vez. El azar lo pone el
servidor con `comun/utilidades/azar.ts` (`crypto.randomInt` + Fisher-Yates):
todos los ordenes son igual de probables y no se pueden adivinar. Antes la
Mesa de Cumplimiento barajaba con `sort(() => Math.random() - 0.5)`, que esta
sesgado (algunos ordenes salian hasta 4 veces mas que otros); ya no se usa en
ningun lado.

- **Ajedrez**: primero las preguntas que no salieron en la partida, al azar;
  despues se repiten sin repetir la anterior. Opciones mezcladas cada vez.
- **Mesa de Cumplimiento**: los casos de la partida, mezclados.
- **Runner Narrativo**: el orden de las preguntas es la historia (no se
  mezcla); las dos opciones de cada pregunta si.

## 6.7 Landing y registro de estudiantes

Sin sesion, `/` lleva a la **landing** (`/bienvenida`): que es Ludus, los
juegos y un formulario para que un **estudiante nuevo** cree su cuenta. Para
registrarse necesita el **codigo de su institucion** (8 caracteres, por
ejemplo `GBSE-5J3K`): la cuenta queda como estudiante de esa institucion y
con la sesion iniciada. No hay registro libre: sin un codigo valido no se
crea nada, y una institucion inactiva no acepta registros.

- El **admin de la institucion** ve el codigo en su dashboard (panel
  "Registro de estudiantes"); el **superadmin**, en Instituciones (boton de
  la llave). Ambos pueden copiar el codigo o un enlace
  `/bienvenida?codigo=...` que llega con el codigo escrito, y **renovarlo**
  si se filtro: el anterior deja de servir y las cuentas ya creadas no
  cambian.
- El codigo no viaja en ninguna otra respuesta (columna con `select: false`).
- 10 codigos equivocados desde una IP la bloquean 15 minutos (429).
- Docentes y admins se siguen dando de alta como antes (un admin o el Excel).

## 6.8 Animaciones de la plataforma

Al cambiar de pagina, sus bloques entran escalonados; los KPI cuentan hasta
su valor; tarjetas, filas de tabla, botones y menu reaccionan al pasar el
mouse y al presionar; los avisos entran con un rebote. Todo es CSS en los
`.module.css` de cada componente (mas `NumeroAnimado.vue`). Una sola regla en
`base.css` apaga animaciones y transiciones si el sistema pide "reducir
movimiento".

## 7. Simplificaciones deliberadas (KISS)

Estas decisiones se tomaron para no sobre-construir funcionalidad que el
prototipo tampoco resolvia, o que no aporta al alcance pedido:

- **No hay juegos simulados.** Las maquetas del prototipo se quitaron del
  catalogo. Un modulo sin juego muestra "Pronto" en el curso y, si se abre su
  URL, un aviso; no hay tablero de mentira ni puntaje al azar.
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

Para subirlo a un servidor, ver **DESPLIEGUE.md**: cubre cPanel y la
combinacion Neon (base) + Vercel (backend y frontend), con las variables de
entorno de cada caso.

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

### 8.2.1 Local o Neon: `DB_ORIGEN`

El `.env` puede tener cargadas **las dos** formas de conexion a la vez — las
variables sueltas de un Postgres local y la `DATABASE_URL` de Neon — y
`DB_ORIGEN` elige cual usar sin que haya que borrar ninguna:

```bash
DB_ORIGEN=local   # usa DB_HOST/DB_PUERTO/... ; ignora DATABASE_URL
DB_ORIGEN=neon    # usa DATABASE_URL ; ignora las variables sueltas
#                 # vacio: si hay DATABASE_URL la usa, si no cae a local
```

Toda la logica vive en `configuracion/conexion-bd.ts`, y de ahi la toman los
cuatro puntos de entrada que abren una conexion (la app, `bd:verificar`,
`migracion:ejecutar` y `semilla`), asi que los cuatro coinciden siempre en
cual base estan usando. Un `DB_ORIGEN` invalido, o `DB_ORIGEN=neon` sin
`DATABASE_URL`, hace que el proceso no arranque con un mensaje que dice
exactamente que falta, en vez de arrancar contra la base equivocada.

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

## 10. Historial del backend: NestJS, Laravel y de vuelta a NestJS

El backend se paso a Laravel (commit `b53722b`) para poder alojarlo en un
cPanel compartido, que corre PHP pero no Node. Al desplegar aparecio el limite
real: ese hosting bloquea las conexiones salientes al puerto 5432, asi que
ningun backend, en ningun lenguaje, podia llegar a Neon desde ahi. Con eso el
proyecto se movio a un servidor propio (AWS Lightsail, ver `DESPLIEGUE.md`),
donde Node corre sin problema, y el backend volvio a NestJS.

La version en Laravel sirvio de todas formas: al compararla respuesta por
respuesta contra NestJS aparecieron bugs del backend original, que se
corrigieron aqui:

- `GET /solicitudes` trae el `curso` o la `ruta` de cada solicitud (antes
  llegaban vacios y la columna "Curso / ruta" quedaba en blanco).
- Aprobar una solicitud de **salida** da de baja al estudiante (antes el
  borrado no encontraba la inscripcion y seguia inscrito).
- Al asignar un personaje a un caso, la respuesta trae el personaje nuevo.
- `POST /usuarios` ya no devuelve el hash de la contrasena.
- Un dato repetido responde `409` y un id que no es UUID responde `400`, en
  vez de `500` (`comun/filtros/errores-bd.filtro.ts`).
- Los mensajes de validacion estan en espanol
  (`comun/validacion/errores-validacion.ts`).

Se verifico contra la version en Laravel sobre la misma base: 628 de 636
consultas GET y 118 de 122 pasos de escritura iguales. Las diferencias que
quedan no son de comportamiento: filas con la misma fecha que cada backend
ordena distinto, el orden al azar de los casos de cada partida, y la
`URL_PUBLICA_API` de cada `.env`.

El codigo en Laravel queda en el historial (commit `7a67130`).
