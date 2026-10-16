export type Rol = 'superadmin' | 'admin_institucion' | 'docente' | 'estudiante';

/** La carga del JWT tal como la devuelve el login: el id viaja como `sub`. */
export interface UsuarioAutenticado {
  sub: string;
  correo: string;
  nombre: string;
  rol: Rol;
  institucionId: string | null;
}

export interface Institucion {
  id: string;
  nombre: string;
  dominio: string;
  activa: boolean;
  creadoEn: string;
  totalDocentes: number;
  totalEstudiantes: number;
  totalCursos: number;
}

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  institucionId: string | null;
  institucion?: Institucion | null;
  activo: boolean;
}

export interface FilaImportacion {
  fila: number;
  nombre: string;
  correo: string;
  rol: string;
  institucion: string;
  errores: string[];
}

export interface ResultadoImportacion {
  filas: FilaImportacion[];
  validas: number;
  conErrores: number;
  creados?: number;
}

export interface Acceso {
  id: string;
  metodo: 'clave' | 'google' | 'scorm';
  ip: string | null;
  agente: string | null;
  creadoEn: string;
  usuario: { id: string; nombre: string; correo: string; rol: Rol; institucion: string | null };
}

export interface ListadoAccesos {
  dias: number;
  resumen: { total: number; usuariosDistintos: number; ultimas24h: number };
  accesos: Acceso[];
}

export interface ModuloCurso {
  id: string;
  cursoId: string;
  titulo: string;
  descripcion: string;
  orden: number;
  califica: boolean;
  configuracionJuego?: ConfiguracionJuego | null;
}

export interface Curso {
  id: string;
  nombre: string;
  descripcion: string;
  institucionId: string;
  docenteId: string | null;
  docente?: Usuario | null;
  modulos: ModuloCurso[];
  totalEstudiantes: number;
  totalModulos: number;
}

export interface RutaCurso {
  id: string;
  rutaId: string;
  cursoId: string;
  orden: number;
  curso: Curso;
}

export interface Ruta {
  id: string;
  nombre: string;
  descripcion: string;
  institucionId: string;
  cursos: RutaCurso[];
  totalEstudiantes: number;
}

export type DecisionCumplimiento = 'aprobar' | 'reforzar' | 'rechazar';

export interface CampoExpediente {
  etiqueta: string;
  valor: string;
}

/** El CEO que aparece en escena a defender su expediente. */
export interface Personaje {
  id: string;
  nombre: string;
  cargo: string;
  /** Ruta publica servida por el backend (/archivos/personajes/...). */
  imagen: string;
  institucionId: string | null;
}

export interface CasoCumplimiento {
  id: string;
  entidad: string;
  tipo: string;
  jurisdiccion: string;
  solicitud: string;
  campos: CampoExpediente[];
  personaje: Pick<Personaje, 'nombre' | 'cargo' | 'imagen'> | null;
}

/** Caso tal como lo edita el docente, con la respuesta y sus seis campos. */
export interface CasoEditable {
  id: string;
  entidad: string;
  tipo: string;
  jurisdiccion: string;
  solicitud: string;
  registroLicencia: string;
  travelRule: string;
  beneficiarioFinal: string;
  controlesAml: string;
  sanciones: string;
  exposicionOnchain: string;
  camposExtra: CampoExpediente[];
  decisionCorrecta: DecisionCumplimiento;
  regla: string;
  explicacion: string;
  origen: string;
  personajeId: string | null;
  personaje: Personaje | null;
  institucionId: string | null;
  activo: boolean;
}

export interface PartidaCumplimiento {
  juego: { clave: string; nombre: string };
  titulo: string;
  instrucciones: string;
  tiempoLimiteSegundos: number;
  escena: { fondo: string };
  casos: CasoCumplimiento[];
}

export interface VeredictoCaso {
  casoId: string;
  entidad: string;
  decisionTomada: DecisionCumplimiento;
  decisionCorrecta: DecisionCumplimiento;
  correcta: boolean;
  regla: string;
  explicacion: string;
  origen: string;
}

export interface CalificacionPartida {
  calificacion: {
    puntaje: number;
    aciertos: number;
    total: number;
    erroresPorExceso: number;
    erroresPorOmision: number;
    detalle: VeredictoCaso[];
  };
  intento: number;
  puntaje: number;
  nota: string | null;
  puntajeMaximo: number;
}

/** Evaluacion mide lo aprendido y puede calificar; ludico nunca califica. */
export type TipoJuego = 'evaluacion' | 'ludico';

export interface Juego {
  id: string;
  clave: string;
  jugable: boolean;
  tipo: TipoJuego;
  nombre: string;
  categoria: string;
  icono: string;
  eslogan: string;
  descripcion: string;
  parametros: string[];
}

export type Velocidad = 'baja' | 'media' | 'alta';

export interface ConfiguracionJuego {
  id: string;
  moduloId: string;
  juegoId: string;
  juego: Juego;
  titulo: string;
  instrucciones: string;
  velocidad: Velocidad;
  tiempoLimiteSegundos: number;
  paresContenido: number;
  intentosPermitidos: number;
  puntajeMaximo: number;
  /** Lo propio de cada juego: mazoId y rondas, tamano, historiaId. */
  ajustes: Record<string, unknown>;
}

/* --- Juegos de fichas (Memorama y Mahjong) --- */

export type ClaveJuegoFichas = 'memorama' | 'mahjong';

export interface Mazo {
  id: string;
  juegoClave: ClaveJuegoFichas;
  nombre: string;
  iconos: string[];
  /** Dorso de la carta (Memorama) o cuerpo de la ficha (Mahjong). */
  imagenFicha: string | null;
  fondo: string | null;
  institucionId: string | null;
}

export interface MazoPartida {
  nombre: string;
  iconos: string[];
  imagenFicha: string | null;
  fondo: string | null;
}

export interface PartidaMemorama {
  juego: { clave: string; nombre: string };
  titulo: string;
  instrucciones: string;
  mazo: MazoPartida;
  rondas: number;
  paresPorRonda: number;
  volteoMs: number;
}

export type TamanoMahjong = 'pequeno' | 'mediano' | 'grande';

export interface PartidaMahjong {
  juego: { clave: string; nombre: string };
  titulo: string;
  instrucciones: string;
  mazo: MazoPartida;
  tamano: TamanoMahjong;
}

/* --- Runner Narrativo --- */

export interface PreguntaHistoria {
  id?: string;
  texto: string;
  respuestaCorrecta: string;
  respuestaIncorrecta: string;
  videoBueno: string | null;
  videoMalo: string | null;
}

export interface Historia {
  id: string;
  nombre: string;
  videoIntro: string | null;
  preguntas: PreguntaHistoria[];
  institucionId: string | null;
}

/** Un video de la historia ya reconocido: de que servicio es y su id. */
export interface VideoExterno {
  fuente: 'youtube' | 'drive';
  id: string;
}

export interface PartidaRunner {
  juego: { clave: string; nombre: string };
  titulo: string;
  instrucciones: string;
  historia: {
    nombre: string;
    videoIntro: VideoExterno | null;
    preguntas: { id: string; texto: string; opciones: { id: string; texto: string }[] }[];
  };
}

export interface VeredictoRunner {
  correcta: boolean;
  video: VideoExterno | null;
}

export interface ResultadoRunner {
  correctas: number;
  total: number;
  completada: boolean;
  puntaje: number;
  nota: string | null;
  intento: number;
}

/** Lo que cualquier juego informa al terminar una partida. */
export interface FinDePartida {
  puntaje: number;
  nota: string | null;
}

export interface Inscripcion {
  id: string;
  estudianteId: string;
  cursoId: string | null;
  rutaId: string | null;
  estudiante: Usuario;
}

export type TipoSolicitud = 'ingreso' | 'salida';
export type EstadoSolicitud = 'pendiente' | 'aprobada' | 'rechazada';

export interface Solicitud {
  id: string;
  estudianteId: string;
  estudiante: Usuario;
  tipo: TipoSolicitud;
  cursoId: string | null;
  curso: Curso | null;
  rutaId: string | null;
  ruta: Ruta | null;
  estado: EstadoSolicitud;
  creadoEn: string;
}

export interface Resultado {
  id: string;
  estudianteId: string;
  estudiante: Usuario;
  moduloId: string;
  modulo: ModuloCurso & { curso: Curso };
  intento: number;
  puntaje: number;
  nota: string | null;
  creadoEn: string;
}

export interface PaqueteScorm {
  id: string;
  token: string;
  moduloId: string;
  modulo?: ModuloCurso & { curso?: Curso };
  creadoPorId: string | null;
  creadoPor?: Usuario | null;
  activo: boolean;
  creadoEn: string;
}

export interface ResumenPanelSuperadmin {
  totalInstituciones: number;
  totalUsuarios: number;
  totalDocentes: number;
  totalEstudiantes: number;
  totalCursos: number;
  totalRutas: number;
}

export interface ResumenPanelAdmin {
  totalDocentes: number;
  totalEstudiantes: number;
  totalCursos: number;
  totalRutas: number;
  solicitudesPendientes: number;
}

export interface ResumenPanelDocente {
  misCursos: number;
  misRutas: number;
  totalEstudiantes: number;
  juegosConfigurados: number;
}

export interface ResumenPanelEstudiante {
  misCursos: number;
  misRutas: number;
}

export type ResumenPanel =
  | ResumenPanelSuperadmin
  | ResumenPanelAdmin
  | ResumenPanelDocente
  | ResumenPanelEstudiante;

export interface EventoActividad {
  texto: string;
  institucion: string;
  cuando: string;
}
