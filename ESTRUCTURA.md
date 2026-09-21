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
- **Los juegos siguen siendo una maqueta visual.** El prototipo dejo la
  mecanica de juego real fuera a proposito ("Pendientes que no hice a
  proposito: juegos realmente jugables"). Esta implementacion respeta eso:
  hay un catalogo real de plantillas de juego, se configuran con parametros
  reales guardados en base de datos, y la pantalla "Jugar" simula una
  partida (tablero decorativo + puntaje aleatorio) que si genera un
  resultado real y, si corresponde, una calificacion real. Programar la
  mecanica de cada uno de los 6 juegos queda para una fase futura.
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
├── juegos/                            Catalogo fijo de plantillas + configuracion por modulo
│   ├── juego.entidad.ts             catalogo (se administra por semilla, no CRUD de usuario)
│   └── configuracion-juego.entidad.ts
├── inscripciones/                    Asigna/reemplaza la lista de estudiantes de un curso o ruta
├── solicitudes/                       Ingreso/salida que pide un estudiante y resuelve un admin
├── resultados/                         Resultado de una partida (puntaje, intento, nota)
├── panel/                              Endpoints de dashboard: /panel/resumen y /panel/actividad
├── migraciones/                       Migraciones de TypeORM (SQL versionado)
└── semilla/semilla.ts                 Script que carga datos de ejemplo
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
├── componentes/
│   ├── base/                     Piezas de UI genericas y reutilizables (Boton, Modal, Tabla, ...)
│   └── diseno/                    Layout de la aplicacion (BarraSuperior, BarraLateral, EsqueletoApp)
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
| `JugarVista` | `/cursos/:cursoId/modulos/:moduloId/jugar` | estudiante |
| `SolicitudesVista` | `/solicitudes` | superadmin, admin_institucion, estudiante |
| `ResultadosVista` (Resultados/Calificaciones) | `/resultados` | todos |
| `ActividadVista` | `/actividad` | superadmin |
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

GET|PUT  /cursos/:cursoId/inscripciones   reemplaza la lista completa de estudiantes
GET|PUT  /rutas/:rutaId/inscripciones

GET|POST /solicitudes                     crear: solo estudiante
PATCH    /solicitudes/:id                 { estado: 'aprobada' | 'rechazada' }; solo admin/superadmin

GET|POST /resultados                      crear: solo estudiante (al terminar una partida)

GET      /panel/resumen                   KPIs segun el rol de quien consulta
GET      /panel/actividad                 solo superadmin
```

## 7. Simplificaciones deliberadas (KISS)

Estas decisiones se tomaron para no sobre-construir funcionalidad que el
prototipo tampoco resolvia, o que no aporta al alcance pedido:

- **Sin mecanica de juego real.** Ver seccion 1. `JugarVista` simula el
  puntaje; el backend si persiste un `resultado` real con ese puntaje.
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
npm run migracion:ejecutar   # crea las tablas
npm run semilla               # carga instituciones, usuarios y datos de ejemplo
npm run start:dev             # http://localhost:3000/api
```

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
