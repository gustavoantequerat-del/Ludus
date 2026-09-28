<?php

namespace App\Consola;

use App\Modelos\ConfiguracionJuego;
use App\Modelos\Curso;
use App\Modelos\Inscripcion;
use App\Modelos\Institucion;
use App\Modelos\Juego;
use App\Modelos\ModuloCurso;
use App\Modelos\Resultado;
use App\Modelos\Ruta;
use App\Modelos\RutaCurso;
use App\Modelos\Solicitud;
use App\Modelos\Usuario;
use App\Soporte\Claves;
use App\Soporte\Rol;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Datos de ejemplo para probar Ludus: tres instituciones, usuarios de cada
 * rol, cursos con modulos, rutas, inscripciones, solicitudes y resultados.
 *
 * Solo corre sobre una base sin instituciones: nunca pisa datos reales.
 * Todos los usuarios quedan con la clave "ludus123"; en produccion no la
 * corras, o cambia esas claves apenas entres.
 *
 * Uso: php artisan semilla
 */
class Semilla extends Command
{
    protected $signature = 'semilla';

    protected $description = 'Carga datos de ejemplo (usuarios de prueba con clave ludus123)';

    private const CLAVE_DEMO = 'ludus123';

    private const CATALOGO_JUEGOS = [
        [
            'clave' => 'viborita-numerica',
            'nombre' => 'Viborita Numerica',
            'categoria' => 'Arcade',
            'icono' => 'worm',
            'eslogan' => 'La vibora crece comiendo solo las respuestas correctas.',
            'descripcion' => 'Guia la vibora hacia el resultado correcto. Cada acierto la hace crecer; un error cuesta una vida.',
            'parametros' => ['Velocidad', 'Pares', 'Vidas'],
        ],
        [
            'clave' => 'torre-de-bloques',
            'nombre' => 'Torre de Bloques',
            'categoria' => 'Logica',
            'icono' => 'blocks',
            'eslogan' => 'Encaja la pieza donde coincide el concepto.',
            'descripcion' => 'Las piezas caen con un valor; encajalas en la columna que corresponde antes de que la torre llegue arriba.',
            'parametros' => ['Caida', 'Niveles', 'Piezas'],
        ],
        [
            'clave' => 'memorama',
            'nombre' => 'Memorama',
            'categoria' => 'Memoria',
            'icono' => 'layout-grid',
            'eslogan' => 'Empareja imagen y concepto contra el reloj.',
            'descripcion' => 'Voltea dos cartas por turno y encuentra los pares de imagen y concepto.',
            'parametros' => ['Pares', 'Tiempo', 'Pistas'],
        ],
        [
            'clave' => 'burbujas',
            'nombre' => 'Burbujas',
            'categoria' => 'Velocidad',
            'icono' => 'circle-dot',
            'eslogan' => 'Revienta la burbuja con la equivalencia correcta.',
            'descripcion' => 'Las burbujas suben con valores; revienta solo las equivalentes al objetivo del nivel.',
            'parametros' => ['Flujo', 'Objetivo', 'Vidas'],
        ],
        [
            'clave' => 'ordena-la-secuencia',
            'nombre' => 'Ordena la Secuencia',
            'categoria' => 'Logica',
            'icono' => 'arrow-down-up',
            'eslogan' => 'Arrastra los elementos hasta el orden correcto.',
            'descripcion' => 'Arrastra las piezas hasta formar la secuencia correcta antes de que termine el tiempo.',
            'parametros' => ['Elementos', 'Tiempo', 'Intentos'],
        ],
        [
            'clave' => 'laberinto',
            'nombre' => 'Laberinto',
            'categoria' => 'Arcade',
            'icono' => 'map',
            'eslogan' => 'Avanza por el camino que resuelve la pista.',
            'descripcion' => 'Recorre el laberinto tomando en cada bifurcacion el camino que responde a la pista.',
            'parametros' => ['Tamano', 'Pistas', 'Vidas'],
        ],
        [
            'clave' => 'mesa-cumplimiento',
            'nombre' => 'Mesa de Cumplimiento',
            'categoria' => 'Decision',
            'icono' => 'shield-check',
            'eslogan' => 'Aprueba o rechaza fintechs segun su expediente.',
            'descripcion' => 'Llegan solicitudes de PSAV y VASP a tu escritorio. Revisa el expediente y decide: aprobar, aprobar con debida diligencia reforzada o rechazar. Aprobar de mas y rechazar por reflejo cuentan como error.',
            'parametros' => ['Casos', 'Tiempo', 'Intentos'],
            'jugable' => true,
        ],
    ];

    public function handle(): int
    {
        if (Institucion::count() > 0) {
            $this->info('La base de datos ya tiene datos. No se vuelve a sembrar.');

            return self::SUCCESS;
        }

        $this->info('Conectado a la base de datos, sembrando datos de ejemplo...');
        DB::transaction(fn () => $this->sembrar());

        $this->info('Semilla completa.');
        $this->line('Usuarios de prueba (clave para todos: "'.self::CLAVE_DEMO.'"):');
        $this->line('  superadmin        -> elena@ludus.io');
        $this->line('  admin_institucion -> marta@nexum.edu.mx');
        $this->line('  docente           -> javier@nexum.edu.mx');
        $this->line('  estudiante        -> sergio@nexum.edu.mx');

        return self::SUCCESS;
    }

    private function sembrar(): void
    {
        $claveHash = Claves::hash(self::CLAVE_DEMO);

        // Juegos: catalogo fijo. Upsert por clave porque una migracion puede
        // haber insertado ya alguna plantilla nueva.
        foreach (self::CATALOGO_JUEGOS as $juego) {
            Juego::updateOrCreate(['clave' => $juego['clave']], $juego + ['jugable' => false]);
        }
        $juego = fn (string $nombre) => Juego::where('nombre', $nombre)->firstOrFail();

        // Instituciones
        $nexum = Institucion::create(['nombre' => 'NEXUM', 'dominio' => 'nexum.edu.mx']);
        $ada = Institucion::create(['nombre' => 'ADA', 'dominio' => 'ada-school.org']);
        $platzi = Institucion::create(['nombre' => 'PLATZI', 'dominio' => 'platzi.institute']);

        $usuario = fn (string $nombre, string $correo, string $rol, ?Institucion $institucion, bool $activo = true) => Usuario::create([
            'nombre' => $nombre,
            'correo' => $correo,
            'clave_hash' => $claveHash,
            'rol' => $rol,
            'institucion_id' => $institucion?->id,
            'activo' => $activo,
        ]);

        // Superadministrador (sin institucion)
        $usuario('Elena Vargas', 'elena@ludus.io', Rol::SUPERADMIN, null);

        // NEXUM
        $usuario('Marta Ibarra', 'marta@nexum.edu.mx', Rol::ADMIN_INSTITUCION, $nexum);
        $javier = $usuario('Javier Mora', 'javier@nexum.edu.mx', Rol::DOCENTE, $nexum);
        $lucia = $usuario('Lucia Ortega', 'lucia@nexum.edu.mx', Rol::DOCENTE, $nexum);
        $sergio = $usuario('Sergio Rios', 'sergio@nexum.edu.mx', Rol::ESTUDIANTE, $nexum);
        $gustavo = $usuario('Gustavo Pena', 'gustavo@nexum.edu.mx', Rol::ESTUDIANTE, $nexum);

        // ADA
        $daniel = $usuario('Daniel Cruz', 'daniel@ada-school.org', Rol::ESTUDIANTE, $ada);

        // PLATZI
        $andres = $usuario('Andres Vela', 'andres@platzi.institute', Rol::DOCENTE, $platzi);
        $guillermo = $usuario('Guillermo Salas', 'guillermo@platzi.institute', Rol::ESTUDIANTE, $platzi, false);

        $curso = fn (string $nombre, string $descripcion, Institucion $institucion, ?Usuario $docente) => Curso::create([
            'nombre' => $nombre,
            'descripcion' => $descripcion,
            'institucion_id' => $institucion->id,
            'docente_id' => $docente?->id,
        ]);

        $matematicas = $curso('Matematicas Basicas', 'Sumas, restas y primeras operaciones con juegos de accion.', $nexum, $javier);
        $operaciones = $curso('Operaciones', 'Multiplicacion y division con retos de velocidad.', $nexum, $javier);
        $algebra = $curso('Algebra Inicial', 'Primeras ecuaciones y valores desconocidos.', $nexum, $javier);
        $fracciones = $curso('Fracciones', 'Equivalencias y comparacion de fracciones.', $nexum, $lucia);
        $lectura = $curso('Lectura Veloz', 'Comprension y vocabulario en formato arcade.', $ada, null);
        $geografia = $curso('Geografia Interactiva', 'Mapas, capitales y relieve.', $platzi, $andres);

        $modulosMatematicas = $this->crearModulos($matematicas, [
            ['Sumas basicas', 'Resolver sumas de una y dos cifras.', true],
            ['Restas sin llevar', 'Restas simples con apoyo visual.', false],
            ['Tablas del 2 al 5', 'Memorizar tablas con pares imagen-resultado.', true],
            ['Repaso general', 'Mezcla de operaciones del curso.', true],
        ]);
        $this->crearModulos($operaciones, [
            ['Multiplicar por 10', 'Patrones al multiplicar por decenas.', true],
            ['Division exacta', 'Repartos sin residuo.', true],
            ['Practica libre', 'Sesion sin calificacion.', false],
        ]);
        $this->crearModulos($algebra, [
            ['El valor oculto', 'Encontrar la incognita en sumas.', true],
        ]);
        $this->crearModulos($fracciones, [
            ['Mitades y cuartos', 'Reconocer fracciones en figuras.', true],
            ['Equivalencias', 'Encontrar fracciones equivalentes.', true],
        ]);
        $this->crearModulos($lectura, [
            ['Sinonimos', 'Asociar palabras de significado cercano.', true],
            ['Orden de la historia', 'Ordenar los hechos de un relato.', false],
        ]);
        $this->crearModulos($geografia, [
            ['Capitales', 'Relacionar pais y capital.', true],
        ]);

        // El primer modulo de Matematicas Basicas, como ejemplo de plantilla configurada.
        ConfiguracionJuego::create([
            'modulo_id' => $modulosMatematicas[0]->id,
            'juego_id' => $juego('Viborita Numerica')->id,
            'titulo' => 'Sumas basicas',
            'instrucciones' => 'Guia la vibora hacia el resultado correcto de cada suma.',
            'velocidad' => 'media',
            'tiempo_limite_segundos' => 180,
            'pares_contenido' => 8,
            'intentos_permitidos' => 3,
            'puntaje_maximo' => 100,
        ]);

        // Curso de Cripto Compliance: usa el juego con mecanica real.
        $criptoCompliance = $curso(
            'Cripto Compliance',
            'Riesgo de activos virtuales aplicado a la banca: PSAV/VASP, marco UIF, Travel Rule y decision basada en riesgo.',
            $nexum,
            $javier,
        );
        $modulosCompliance = $this->crearModulos($criptoCompliance, [
            ['Due Diligence de PSAV y VASP', 'Revisa expedientes de fintechs y decide aprobar, reforzar controles o rechazar.', true],
        ]);
        ConfiguracionJuego::create([
            'modulo_id' => $modulosCompliance[0]->id,
            'juego_id' => $juego('Mesa de Cumplimiento')->id,
            'titulo' => 'Mesa de Cumplimiento',
            'instrucciones' => 'Cada solicitud trae su expediente. Decide con la evidencia: el registro es punto de partida, no conclusion, y rechazar sin sustento tambien es un error.',
            'velocidad' => 'media',
            'tiempo_limite_segundos' => 420,
            'pares_contenido' => 8,
            'intentos_permitidos' => 3,
            'puntaje_maximo' => 100,
        ]);

        // Rutas
        $ruta = fn (string $nombre, string $descripcion, Institucion $institucion) => Ruta::create([
            'nombre' => $nombre,
            'descripcion' => $descripcion,
            'institucion_id' => $institucion->id,
        ]);
        $matematicasIniciales = $ruta('Matematicas Iniciales', 'Recorrido completo de aritmetica para primaria.', $nexum);
        $refuerzoEscolar = $ruta('Refuerzo Escolar', 'Apoyo para estudiantes que vienen de otro ciclo.', $nexum);
        $lectoescritura = $ruta('Lectoescritura', 'Comprension lectora y vocabulario.', $ada);

        foreach ([
            [$matematicasIniciales, $matematicas, 1],
            [$matematicasIniciales, $operaciones, 2],
            [$matematicasIniciales, $fracciones, 3],
            [$matematicasIniciales, $algebra, 4],
            [$refuerzoEscolar, $matematicas, 1],
            [$refuerzoEscolar, $fracciones, 2],
            [$lectoescritura, $lectura, 1],
        ] as [$rutaDestino, $cursoDestino, $orden]) {
            RutaCurso::create(['ruta_id' => $rutaDestino->id, 'curso_id' => $cursoDestino->id, 'orden' => $orden]);
        }

        // Inscripciones (estudiantes en cursos y rutas)
        foreach ([
            [$sergio, $matematicas], [$sergio, $operaciones], [$sergio, $criptoCompliance],
            [$gustavo, $criptoCompliance], [$gustavo, $matematicas], [$gustavo, $fracciones],
            [$daniel, $lectura], [$guillermo, $geografia],
        ] as [$estudiante, $cursoDestino]) {
            Inscripcion::create(['estudiante_id' => $estudiante->id, 'curso_id' => $cursoDestino->id]);
        }
        foreach ([
            [$sergio, $matematicasIniciales], [$gustavo, $matematicasIniciales],
            [$gustavo, $refuerzoEscolar], [$daniel, $lectoescritura],
        ] as [$estudiante, $rutaDestino]) {
            Inscripcion::create(['estudiante_id' => $estudiante->id, 'ruta_id' => $rutaDestino->id]);
        }

        // Solicitudes de ejemplo
        foreach ([
            [$daniel, Solicitud::INGRESO, null, $lectoescritura, Solicitud::PENDIENTE],
            [$gustavo, Solicitud::SALIDA, $fracciones, null, Solicitud::PENDIENTE],
            [$sergio, Solicitud::INGRESO, $algebra, null, Solicitud::PENDIENTE],
            [$gustavo, Solicitud::INGRESO, $operaciones, null, Solicitud::APROBADA],
            [$daniel, Solicitud::SALIDA, $geografia, null, Solicitud::RECHAZADA],
        ] as [$estudiante, $tipo, $cursoDestino, $rutaDestino, $estado]) {
            Solicitud::create([
                'estudiante_id' => $estudiante->id,
                'tipo' => $tipo,
                'curso_id' => $cursoDestino?->id,
                'ruta_id' => $rutaDestino?->id,
                'estado' => $estado,
            ]);
        }

        // Resultados de ejemplo
        foreach ([
            [$sergio, $modulosMatematicas[0], 1, 92, '9.2'],
            [$sergio, $modulosMatematicas[1], 2, 70, null],
            [$gustavo, $modulosMatematicas[0], 1, 78, '7.8'],
        ] as [$estudiante, $modulo, $intento, $puntaje, $nota]) {
            Resultado::create([
                'estudiante_id' => $estudiante->id,
                'modulo_id' => $modulo->id,
                'intento' => $intento,
                'puntaje' => $puntaje,
                'nota' => $nota,
            ]);
        }
    }

    /** @param  array<int, array{0: string, 1: string, 2: bool}>  $definiciones */
    private function crearModulos(Curso $curso, array $definiciones): array
    {
        return array_map(fn ($definicion, $indice) => ModuloCurso::create([
            'curso_id' => $curso->id,
            'titulo' => $definicion[0],
            'descripcion' => $definicion[1],
            'orden' => $indice + 1,
            'califica' => $definicion[2],
        ]), $definiciones, array_keys($definiciones));
    }
}
