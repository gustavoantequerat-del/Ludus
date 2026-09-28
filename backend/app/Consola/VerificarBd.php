<?php

namespace App\Consola;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Diagnostico de la conexion a PostgreSQL.
 *
 * Responde tres preguntas en orden: se llega al servidor, se puede entrar con
 * las credenciales, y la base esta lista para usarse (migraciones y datos).
 * Cada fallo explica que hacer, en vez de dejar el error crudo del driver.
 *
 * Usa la misma configuracion que la aplicacion, asi que lo que verifica es
 * exactamente lo que va a usar el backend.
 *
 * Uso: php artisan bd:verificar
 */
class VerificarBd extends Command
{
    protected $signature = 'bd:verificar';

    protected $description = 'Verifica la conexion a PostgreSQL y el estado del esquema';

    private const TABLAS_ESPERADAS = [
        'instituciones', 'usuarios', 'cursos', 'modulos_curso', 'rutas', 'juegos',
        'inscripciones', 'solicitudes', 'resultados', 'paquetes_scorm', 'personajes',
        'casos_cumplimiento',
    ];

    public function handle(): int
    {
        $this->line('Verificando la conexion a PostgreSQL...');

        $errorDeConfiguracion = config('database.connections.pgsql.error_ludus');
        if ($errorDeConfiguracion) {
            $this->titulo('Configuracion');
            $this->fallo($errorDeConfiguracion);
            $this->newLine();

            return self::FAILURE;
        }
        $this->mostrarConfiguracion();

        $this->titulo('Requisitos de PHP');
        foreach (['pdo_pgsql' => 'conectar a PostgreSQL', 'zip' => 'exportar paquetes SCORM', 'mbstring' => 'Laravel'] as $extension => $para) {
            if (extension_loaded($extension)) {
                $this->ok("Extension {$extension} activa");
            } else {
                $this->fallo("Falta la extension {$extension} (se usa para {$para}).");
                $this->comoArreglar(['En cPanel: Select PHP Version > Extensions, y marca '.$extension]);
                if ($extension === 'pdo_pgsql') {
                    return self::FAILURE;
                }
            }
        }

        $this->titulo('Conexion');
        try {
            $version = DB::selectOne('SHOW server_version')->server_version;
        } catch (Throwable $error) {
            $this->explicarFallo($error);
            $this->newLine();

            return self::FAILURE;
        }
        $this->ok("Conectado a PostgreSQL {$version}");
        $this->revisarEsquema();
        $this->newLine();

        return self::SUCCESS;
    }

    private function mostrarConfiguracion(): void
    {
        $config = config('database.connections.pgsql');
        $origenForzado = $config['origen_forzado_ludus'];
        $porQue = $origenForzado !== ''
            ? "forzado por DB_ORIGEN={$origenForzado}"
            : ($config['origen_ludus'] === 'neon' ? 'DATABASE_URL esta definida' : 'no hay DATABASE_URL ni DB_ORIGEN');

        $this->titulo('Configuracion que se esta usando');
        $this->line('  base de datos: '.($config['origen_ludus'] === 'neon' ? 'Neon (DATABASE_URL)' : 'local'));
        $this->line("  por que:       {$porQue}");
        $this->line("  host:    {$config['host']}");
        $this->line("  puerto:  {$config['port']}");
        $this->line("  base:    {$config['database']}");
        $this->line("  usuario: {$config['username']}");
        $this->line('  clave:   '.($config['password'] !== '' ? '(definida)' : '(vacia)'));
        $this->line('  ssl:     '.($config['sslmode'] === 'require' ? 'si' : 'no'));

        if (! file_exists(base_path('.env'))) {
            $this->line('  origen:  valores por defecto (no existe el archivo .env)');
            $this->aviso('No hay archivo .env; se estan usando los valores por defecto.');
            $this->comoArreglar(['cp .env.example .env', 'y ajusta las credenciales si tu PostgreSQL usa otras.']);
        }
    }

    /** Traduce el error del driver a una causa concreta y su remedio. */
    private function explicarFallo(Throwable $error): void
    {
        $config = config('database.connections.pgsql');
        $mensaje = $error->getMessage();
        $destino = "{$config['host']}:{$config['port']}";

        if (str_contains($mensaje, 'Connection refused')) {
            $this->fallo("No hay nadie escuchando en {$destino}.");
            $this->comoArreglar([
                'Verifica que PostgreSQL este corriendo:',
                '  Linux:   sudo service postgresql start',
                '  macOS:   brew services start postgresql',
                '  Windows: inicia el servicio PostgreSQL desde Servicios',
                'Si corre en otro puerto, ajusta DB_PUERTO en el .env',
            ]);
        } elseif (str_contains($mensaje, 'could not translate host name')) {
            $this->fallo("No se pudo resolver el host \"{$config['host']}\".");
            $this->comoArreglar(['Revisa DB_HOST (o el host de DATABASE_URL) en el .env']);
        } elseif (str_contains($mensaje, 'timeout expired') || str_contains($mensaje, 'timed out')) {
            $this->fallo("Tiempo de espera agotado contra {$destino}.");
            $this->comoArreglar([
                'Suele ser un firewall o una base remota inalcanzable.',
                'Algunos hostings compartidos bloquean las conexiones salientes al puerto 5432:',
                'pregunta al soporte del hosting si lo pueden habilitar.',
            ]);
        } elseif (str_contains($mensaje, 'password authentication failed') || str_contains($mensaje, 'no password supplied')) {
            $this->fallo("El usuario \"{$config['username']}\" no pudo autenticarse.");
            $this->comoArreglar([
                'Revisa DB_USUARIO y DB_CLAVE (o la DATABASE_URL) en el .env, o crea el usuario:',
                "  sudo -u postgres psql -c \"CREATE USER {$config['username']} WITH PASSWORD '...';\"",
            ]);
        } elseif (preg_match('/database ".*" does not exist/', $mensaje)) {
            $this->fallo("El servidor responde, pero la base \"{$config['database']}\" no existe.");
            $this->comoArreglar([
                'Creala con:',
                "  sudo -u postgres psql -c \"CREATE DATABASE {$config['database']} OWNER {$config['username']};\"",
                'y despues ejecuta: php artisan migrate --force && php artisan semilla',
            ]);
        } elseif (stripos($mensaje, 'could not find driver') !== false) {
            $this->fallo('PHP no tiene el driver de PostgreSQL (pdo_pgsql).');
            $this->comoArreglar(['En cPanel: Select PHP Version > Extensions, y marca pdo_pgsql']);
        } else {
            $this->fallo($mensaje);
        }
    }

    private function revisarEsquema(): void
    {
        $this->titulo('Estado de la base');

        $presentes = array_map(
            fn ($fila) => $fila->table_name,
            DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        );
        $faltantes = array_values(array_diff(self::TABLAS_ESPERADAS, $presentes));

        if (empty($presentes)) {
            $this->aviso('La base existe pero esta vacia: no hay tablas.');
            $this->comoArreglar(['php artisan migrate --force', 'php artisan semilla']);

            return;
        }

        if (! empty($faltantes)) {
            $this->aviso('Faltan tablas: '.implode(', ', $faltantes));
            $this->comoArreglar(['php artisan migrate --force']);
        } else {
            $this->ok('Esquema completo ('.count($presentes).' tablas).');
        }

        if (in_array('migrations', $presentes)) {
            $this->ok('Migraciones del backend anterior (TypeORM): '.DB::table('migrations')->count());
        }
        if (Schema::hasTable(config('database.migrations.table'))) {
            $aplicadas = DB::table(config('database.migrations.table'))->orderBy('id')->pluck('migration');
            $this->ok("Migraciones de Laravel aplicadas: {$aplicadas->count()}");
            $aplicadas->each(fn ($nombre) => $this->line("            - {$nombre}"));
        } else {
            $this->aviso('Laravel todavia no registro sus migraciones.');
            $this->comoArreglar(['php artisan migrate --force   (sobre una base existente no cambia nada)']);
        }

        if (! empty($faltantes)) {
            return;
        }

        $usuarios = DB::table('usuarios')->count();
        $juegos = DB::table('juegos')->count();
        if ($usuarios === 0) {
            $this->aviso('No hay usuarios cargados: todavia no vas a poder iniciar sesion.');
            $this->comoArreglar(['php artisan semilla']);
        } else {
            $this->ok("Datos cargados: {$usuarios} usuarios, {$juegos} juegos en el catalogo.");
        }
    }

    private function titulo(string $texto): void
    {
        $this->newLine();
        $this->line($texto);
    }

    private function ok(string $texto): void
    {
        $this->line("  [OK]    {$texto}");
    }

    private function aviso(string $texto): void
    {
        $this->line("  [AVISO] {$texto}");
    }

    private function fallo(string $texto): void
    {
        $this->line("  [ERROR] {$texto}");
    }

    private function comoArreglar(array $pasos): void
    {
        $this->newLine();
        $this->line('  Como arreglarlo:');
        foreach ($pasos as $paso) {
            $this->line("    {$paso}");
        }
    }
}
