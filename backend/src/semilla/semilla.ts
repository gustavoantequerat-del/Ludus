import 'reflect-metadata';
import { config as cargarEnv } from 'dotenv';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { opcionesDeConexion } from '../configuracion/conexion-bd';
import { Institucion } from '../instituciones/institucion.entidad';
import { Usuario } from '../usuarios/usuario.entidad';
import { Curso } from '../cursos/curso.entidad';
import { ModuloCurso } from '../cursos/modulo-curso.entidad';
import { Ruta } from '../rutas/ruta.entidad';
import { RutaCurso } from '../rutas/ruta-curso.entidad';
import { Juego } from '../juegos/juego.entidad';
import { ConfiguracionJuego } from '../juegos/configuracion-juego.entidad';
import { Inscripcion } from '../inscripciones/inscripcion.entidad';
import { Solicitud, TipoSolicitud, EstadoSolicitud } from '../solicitudes/solicitud.entidad';
import { Resultado } from '../resultados/resultado.entidad';
import { Rol } from '../comun/enums/rol.enum';

cargarEnv();

const origen = new DataSource({
  type: 'postgres',
  ...opcionesDeConexion(),
  entities: [__dirname + '/../**/*.entidad{.ts,.js}'],
});

const CLAVE_DEMO = 'ludus123';

const CATALOGO_JUEGOS = [
  {
    clave: 'viborita-numerica',
    nombre: 'Viborita Numerica',
    categoria: 'Arcade',
    icono: 'worm',
    eslogan: 'La vibora crece comiendo solo las respuestas correctas.',
    descripcion:
      'Guia la vibora hacia el resultado correcto. Cada acierto la hace crecer; un error cuesta una vida.',
    parametros: ['Velocidad', 'Pares', 'Vidas'],
  },
  {
    clave: 'torre-de-bloques',
    nombre: 'Torre de Bloques',
    categoria: 'Logica',
    icono: 'blocks',
    eslogan: 'Encaja la pieza donde coincide el concepto.',
    descripcion:
      'Las piezas caen con un valor; encajalas en la columna que corresponde antes de que la torre llegue arriba.',
    parametros: ['Caida', 'Niveles', 'Piezas'],
  },
  {
    clave: 'memorama',
    nombre: 'Memorama',
    categoria: 'Memoria',
    icono: 'layout-grid',
    eslogan: 'Empareja imagen y concepto contra el reloj.',
    descripcion: 'Voltea dos cartas por turno y encuentra los pares de imagen y concepto.',
    parametros: ['Pares', 'Tiempo', 'Pistas'],
  },
  {
    clave: 'burbujas',
    nombre: 'Burbujas',
    categoria: 'Velocidad',
    icono: 'circle-dot',
    eslogan: 'Revienta la burbuja con la equivalencia correcta.',
    descripcion:
      'Las burbujas suben con valores; revienta solo las equivalentes al objetivo del nivel.',
    parametros: ['Flujo', 'Objetivo', 'Vidas'],
  },
  {
    clave: 'ordena-la-secuencia',
    nombre: 'Ordena la Secuencia',
    categoria: 'Logica',
    icono: 'arrow-down-up',
    eslogan: 'Arrastra los elementos hasta el orden correcto.',
    descripcion: 'Arrastra las piezas hasta formar la secuencia correcta antes de que termine el tiempo.',
    parametros: ['Elementos', 'Tiempo', 'Intentos'],
  },
  {
    clave: 'laberinto',
    nombre: 'Laberinto',
    categoria: 'Arcade',
    icono: 'map',
    eslogan: 'Avanza por el camino que resuelve la pista.',
    descripcion: 'Recorre el laberinto tomando en cada bifurcacion el camino que responde a la pista.',
    parametros: ['Tamano', 'Pistas', 'Vidas'],
  },
  {
    clave: 'mesa-cumplimiento',
    nombre: 'Mesa de Cumplimiento',
    categoria: 'Decision',
    icono: 'shield-check',
    eslogan: 'Aprueba o rechaza fintechs segun su expediente.',
    descripcion:
      'Llegan solicitudes de PSAV y VASP a tu escritorio. Revisa el expediente y decide: aprobar, aprobar con debida diligencia reforzada o rechazar. Aprobar de mas y rechazar por reflejo cuentan como error.',
    parametros: ['Casos', 'Tiempo', 'Intentos'],
    jugable: true,
  },
];

async function sembrar() {
  await origen.initialize();
  console.log('Conectado a la base de datos, sembrando datos de ejemplo...');

  const institucionesRepo = origen.getRepository(Institucion);
  const usuariosRepo = origen.getRepository(Usuario);
  const cursosRepo = origen.getRepository(Curso);
  const modulosRepo = origen.getRepository(ModuloCurso);
  const rutasRepo = origen.getRepository(Ruta);
  const rutasCursosRepo = origen.getRepository(RutaCurso);
  const juegosRepo = origen.getRepository(Juego);
  const configuracionesRepo = origen.getRepository(ConfiguracionJuego);
  const inscripcionesRepo = origen.getRepository(Inscripcion);
  const solicitudesRepo = origen.getRepository(Solicitud);
  const resultadosRepo = origen.getRepository(Resultado);

  const totalPrevio = await institucionesRepo.count();
  if (totalPrevio > 0) {
    console.log('La base de datos ya tiene datos. No se vuelve a sembrar.');
    await origen.destroy();
    return;
  }

  const claveHash = await bcrypt.hash(CLAVE_DEMO, 10);

  // Juegos: catalogo fijo. Se hace upsert por clave porque una migracion
  // puede haber insertado ya alguna plantilla nueva.
  await juegosRepo.upsert(CATALOGO_JUEGOS, ['clave']);
  const juegos = await juegosRepo.find();
  const juegoPorNombre = (nombre: string) => juegos.find((j) => j.nombre === nombre)!;

  // Instituciones
  const [nexum, ada, platzi] = await institucionesRepo.save([
    institucionesRepo.create({ nombre: 'NEXUM', dominio: 'nexum.edu.mx' }),
    institucionesRepo.create({ nombre: 'ADA', dominio: 'ada-school.org' }),
    institucionesRepo.create({ nombre: 'PLATZI', dominio: 'platzi.institute' }),
  ]);

  // Superadministrador (sin institucion)
  const superadmin = await usuariosRepo.save(
    usuariosRepo.create({
      nombre: 'Elena Vargas',
      correo: 'elena@ludus.io',
      claveHash,
      rol: Rol.SUPERADMIN,
      institucionId: null,
    }),
  );

  // Usuarios de NEXUM
  const [marta, javier, lucia, sergio, gustavo] = await usuariosRepo.save([
    usuariosRepo.create({ nombre: 'Marta Ibarra', correo: 'marta@nexum.edu.mx', claveHash, rol: Rol.ADMIN_INSTITUCION, institucionId: nexum.id }),
    usuariosRepo.create({ nombre: 'Javier Mora', correo: 'javier@nexum.edu.mx', claveHash, rol: Rol.DOCENTE, institucionId: nexum.id }),
    usuariosRepo.create({ nombre: 'Lucia Ortega', correo: 'lucia@nexum.edu.mx', claveHash, rol: Rol.DOCENTE, institucionId: nexum.id }),
    usuariosRepo.create({ nombre: 'Sergio Rios', correo: 'sergio@nexum.edu.mx', claveHash, rol: Rol.ESTUDIANTE, institucionId: nexum.id }),
    usuariosRepo.create({ nombre: 'Gustavo Pena', correo: 'gustavo@nexum.edu.mx', claveHash, rol: Rol.ESTUDIANTE, institucionId: nexum.id }),
  ]);

  // Usuarios de ADA
  const [daniel] = await usuariosRepo.save([
    usuariosRepo.create({ nombre: 'Daniel Cruz', correo: 'daniel@ada-school.org', claveHash, rol: Rol.ESTUDIANTE, institucionId: ada.id }),
  ]);

  // Usuarios de PLATZI
  const [andres, guillermo] = await usuariosRepo.save([
    usuariosRepo.create({ nombre: 'Andres Vela', correo: 'andres@platzi.institute', claveHash, rol: Rol.DOCENTE, institucionId: platzi.id }),
    usuariosRepo.create({ nombre: 'Guillermo Salas', correo: 'guillermo@platzi.institute', claveHash, rol: Rol.ESTUDIANTE, institucionId: platzi.id, activo: false }),
  ]);

  // Cursos de NEXUM (docente Javier)
  const [matematicas, operaciones, algebra] = await cursosRepo.save([
    cursosRepo.create({ nombre: 'Matematicas Basicas', descripcion: 'Sumas, restas y primeras operaciones con juegos de accion.', institucionId: nexum.id, docenteId: javier.id }),
    cursosRepo.create({ nombre: 'Operaciones', descripcion: 'Multiplicacion y division con retos de velocidad.', institucionId: nexum.id, docenteId: javier.id }),
    cursosRepo.create({ nombre: 'Algebra Inicial', descripcion: 'Primeras ecuaciones y valores desconocidos.', institucionId: nexum.id, docenteId: javier.id }),
  ]);
  // Curso de NEXUM (docente Lucia)
  const [fracciones] = await cursosRepo.save([
    cursosRepo.create({ nombre: 'Fracciones', descripcion: 'Equivalencias y comparacion de fracciones.', institucionId: nexum.id, docenteId: lucia.id }),
  ]);
  // Curso de ADA (docente Lucia, cruzando institucion solo para semilla de ejemplo no aplica: se usa un docente ficticio de ADA)
  const [lectura] = await cursosRepo.save([
    cursosRepo.create({ nombre: 'Lectura Veloz', descripcion: 'Comprension y vocabulario en formato arcade.', institucionId: ada.id, docenteId: null }),
  ]);
  // Curso de PLATZI
  const [geografia] = await cursosRepo.save([
    cursosRepo.create({ nombre: 'Geografia Interactiva', descripcion: 'Mapas, capitales y relieve.', institucionId: platzi.id, docenteId: andres.id }),
  ]);

  const crearModulos = (cursoId: string, defs: { titulo: string; descripcion: string; juego?: string; califica: boolean }[]) =>
    modulosRepo.save(
      defs.map((d, i) =>
        modulosRepo.create({ cursoId, titulo: d.titulo, descripcion: d.descripcion, orden: i + 1, califica: d.califica }),
      ),
    );

  const modulosMatematicas = await crearModulos(matematicas.id, [
    { titulo: 'Sumas basicas', descripcion: 'Resolver sumas de una y dos cifras.', juego: 'Viborita Numerica', califica: true },
    { titulo: 'Restas sin llevar', descripcion: 'Restas simples con apoyo visual.', juego: 'Burbujas', califica: false },
    { titulo: 'Tablas del 2 al 5', descripcion: 'Memorizar tablas con pares imagen-resultado.', juego: 'Memorama', califica: true },
    { titulo: 'Repaso general', descripcion: 'Mezcla de operaciones del curso.', califica: true },
  ]);
  await crearModulos(operaciones.id, [
    { titulo: 'Multiplicar por 10', descripcion: 'Patrones al multiplicar por decenas.', juego: 'Torre de Bloques', califica: true },
    { titulo: 'Division exacta', descripcion: 'Repartos sin residuo.', juego: 'Ordena la Secuencia', califica: true },
    { titulo: 'Practica libre', descripcion: 'Sesion sin calificacion.', juego: 'Viborita Numerica', califica: false },
  ]);
  await crearModulos(algebra.id, [
    { titulo: 'El valor oculto', descripcion: 'Encontrar la incognita en sumas.', juego: 'Laberinto', califica: true },
  ]);
  await crearModulos(fracciones.id, [
    { titulo: 'Mitades y cuartos', descripcion: 'Reconocer fracciones en figuras.', juego: 'Burbujas', califica: true },
    { titulo: 'Equivalencias', descripcion: 'Encontrar fracciones equivalentes.', juego: 'Memorama', califica: true },
  ]);
  await crearModulos(lectura.id, [
    { titulo: 'Sinonimos', descripcion: 'Asociar palabras de significado cercano.', juego: 'Memorama', califica: true },
    { titulo: 'Orden de la historia', descripcion: 'Ordenar los hechos de un relato.', juego: 'Ordena la Secuencia', califica: false },
  ]);
  await crearModulos(geografia.id, [
    { titulo: 'Capitales', descripcion: 'Relacionar pais y capital.', juego: 'Laberinto', califica: true },
  ]);

  // Configurar el primer modulo de Matematicas Basicas como ejemplo de plantilla configurada
  await configuracionesRepo.save(
    configuracionesRepo.create({
      moduloId: modulosMatematicas[0].id,
      juegoId: juegoPorNombre('Viborita Numerica').id,
      titulo: 'Sumas basicas',
      instrucciones: 'Guia la vibora hacia el resultado correcto de cada suma.',
      velocidad: 'media',
      tiempoLimiteSegundos: 180,
      paresContenido: 8,
      intentosPermitidos: 3,
      puntajeMaximo: 100,
    }),
  );

  // Curso de Cripto Compliance: usa el juego con mecanica real
  const [criptoCompliance] = await cursosRepo.save([
    cursosRepo.create({
      nombre: 'Cripto Compliance',
      descripcion:
        'Riesgo de activos virtuales aplicado a la banca: PSAV/VASP, marco UIF, Travel Rule y decision basada en riesgo.',
      institucionId: nexum.id,
      docenteId: javier.id,
    }),
  ]);
  const modulosCompliance = await crearModulos(criptoCompliance.id, [
    {
      titulo: 'Due Diligence de PSAV y VASP',
      descripcion:
        'Revisa expedientes de fintechs y decide aprobar, reforzar controles o rechazar.',
      califica: true,
    },
  ]);
  await configuracionesRepo.save(
    configuracionesRepo.create({
      moduloId: modulosCompliance[0].id,
      juegoId: juegoPorNombre('Mesa de Cumplimiento').id,
      titulo: 'Mesa de Cumplimiento',
      instrucciones:
        'Cada solicitud trae su expediente. Decide con la evidencia: el registro es punto de partida, no conclusion, y rechazar sin sustento tambien es un error.',
      velocidad: 'media',
      tiempoLimiteSegundos: 420,
      paresContenido: 8,
      intentosPermitidos: 3,
      puntajeMaximo: 100,
    }),
  );

  // Rutas
  const [matematicasIniciales, refuerzoEscolar] = await rutasRepo.save([
    rutasRepo.create({ nombre: 'Matematicas Iniciales', descripcion: 'Recorrido completo de aritmetica para primaria.', institucionId: nexum.id }),
    rutasRepo.create({ nombre: 'Refuerzo Escolar', descripcion: 'Apoyo para estudiantes que vienen de otro ciclo.', institucionId: nexum.id }),
  ]);
  const [lectoescritura] = await rutasRepo.save([
    rutasRepo.create({ nombre: 'Lectoescritura', descripcion: 'Comprension lectora y vocabulario.', institucionId: ada.id }),
  ]);

  await rutasCursosRepo.save([
    rutasCursosRepo.create({ rutaId: matematicasIniciales.id, cursoId: matematicas.id, orden: 1 }),
    rutasCursosRepo.create({ rutaId: matematicasIniciales.id, cursoId: operaciones.id, orden: 2 }),
    rutasCursosRepo.create({ rutaId: matematicasIniciales.id, cursoId: fracciones.id, orden: 3 }),
    rutasCursosRepo.create({ rutaId: matematicasIniciales.id, cursoId: algebra.id, orden: 4 }),
    rutasCursosRepo.create({ rutaId: refuerzoEscolar.id, cursoId: matematicas.id, orden: 1 }),
    rutasCursosRepo.create({ rutaId: refuerzoEscolar.id, cursoId: fracciones.id, orden: 2 }),
    rutasCursosRepo.create({ rutaId: lectoescritura.id, cursoId: lectura.id, orden: 1 }),
  ]);

  // Inscripciones (estudiantes en cursos y rutas)
  await inscripcionesRepo.save([
    inscripcionesRepo.create({ estudianteId: sergio.id, cursoId: matematicas.id }),
    inscripcionesRepo.create({ estudianteId: sergio.id, cursoId: operaciones.id }),
    inscripcionesRepo.create({ estudianteId: sergio.id, cursoId: criptoCompliance.id }),
    inscripcionesRepo.create({ estudianteId: gustavo.id, cursoId: criptoCompliance.id }),
    inscripcionesRepo.create({ estudianteId: gustavo.id, cursoId: matematicas.id }),
    inscripcionesRepo.create({ estudianteId: gustavo.id, cursoId: fracciones.id }),
    inscripcionesRepo.create({ estudianteId: daniel.id, cursoId: lectura.id }),
    inscripcionesRepo.create({ estudianteId: guillermo.id, cursoId: geografia.id }),
    inscripcionesRepo.create({ estudianteId: sergio.id, rutaId: matematicasIniciales.id }),
    inscripcionesRepo.create({ estudianteId: gustavo.id, rutaId: matematicasIniciales.id }),
    inscripcionesRepo.create({ estudianteId: gustavo.id, rutaId: refuerzoEscolar.id }),
    inscripcionesRepo.create({ estudianteId: daniel.id, rutaId: lectoescritura.id }),
  ]);

  // Solicitudes de ejemplo
  await solicitudesRepo.save([
    solicitudesRepo.create({ estudianteId: daniel.id, tipo: TipoSolicitud.INGRESO, cursoId: null, rutaId: lectoescritura.id, estado: EstadoSolicitud.PENDIENTE }),
    solicitudesRepo.create({ estudianteId: gustavo.id, tipo: TipoSolicitud.SALIDA, cursoId: fracciones.id, estado: EstadoSolicitud.PENDIENTE }),
    solicitudesRepo.create({ estudianteId: sergio.id, tipo: TipoSolicitud.INGRESO, cursoId: algebra.id, estado: EstadoSolicitud.PENDIENTE }),
    solicitudesRepo.create({ estudianteId: gustavo.id, tipo: TipoSolicitud.INGRESO, cursoId: operaciones.id, estado: EstadoSolicitud.APROBADA }),
    solicitudesRepo.create({ estudianteId: daniel.id, tipo: TipoSolicitud.SALIDA, cursoId: geografia.id, estado: EstadoSolicitud.RECHAZADA }),
  ]);

  // Resultados de ejemplo
  await resultadosRepo.save([
    resultadosRepo.create({ estudianteId: sergio.id, moduloId: modulosMatematicas[0].id, intento: 1, puntaje: 92, nota: '9.2' }),
    resultadosRepo.create({ estudianteId: sergio.id, moduloId: modulosMatematicas[1].id, intento: 2, puntaje: 70, nota: null }),
    resultadosRepo.create({ estudianteId: gustavo.id, moduloId: modulosMatematicas[0].id, intento: 1, puntaje: 78, nota: '7.8' }),
  ]);

  console.log('Semilla completa.');
  console.log(`Usuarios de prueba (clave para todos: "${CLAVE_DEMO}"):`);
  console.log(`  superadmin       -> ${superadmin.correo}`);
  console.log(`  admin_institucion -> ${marta.correo}`);
  console.log(`  docente          -> ${javier.correo}`);
  console.log(`  estudiante       -> ${sergio.correo}`);

  await origen.destroy();
}

sembrar().catch(async (error) => {
  console.error('Error al sembrar datos:', error);
  await origen.destroy();
  process.exit(1);
});
