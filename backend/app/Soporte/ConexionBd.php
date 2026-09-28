<?php

namespace App\Soporte;

use RuntimeException;

/**
 * Un solo lugar donde se decide como conectar a PostgreSQL.
 *
 * Lo usan la aplicacion, las migraciones, la semilla y el diagnostico
 * (bd:verificar), y al desplegar es justo lo que cambia: por eso vive aparte
 * y no repetido en cada uno.
 *
 * Acepta las dos formas en que los proveedores entregan una base:
 * - DATABASE_URL completa (Neon, Render, Railway, Supabase).
 * - Las variables sueltas DB_HOST, DB_PUERTO, ... (cPanel, local).
 *
 * Y como en desarrollo es comun tener las dos cargadas a la vez (un Postgres
 * local para trabajar rapido, y la URL de Neon a mano para probar contra la
 * base real), DB_ORIGEN elige cual usar sin tener que borrar ninguna:
 *
 *   DB_ORIGEN=local   -> usa DB_HOST/DB_PUERTO/... e ignora DATABASE_URL
 *   DB_ORIGEN=neon    -> usa DATABASE_URL e ignora las variables sueltas
 *   (sin definir)     -> si hay DATABASE_URL la usa; si no, cae a local
 *
 * Mismas variables y mismas reglas que tenia el backend en NestJS, para que
 * un .env o un panel de hosting ya configurado siga sirviendo tal cual.
 */
final class ConexionBd
{
    /**
     * @return array{origen: string, host: string, puerto: int, usuario: string, clave: string, nombre: string, ssl: bool}
     */
    public static function leer(): array
    {
        $origenForzado = self::origenForzado();
        if ($origenForzado !== '' && $origenForzado !== 'local' && $origenForzado !== 'neon') {
            throw new RuntimeException(
                "DB_ORIGEN=\"{$origenForzado}\" no es un valor valido. Usa \"local\", \"neon\", o dejalo vacio."
            );
        }

        $url = trim((string) self::variable('DATABASE_URL'));
        $usarNeon = $origenForzado === 'neon' || ($origenForzado === '' && $url !== '');

        if ($usarNeon) {
            if ($url === '') {
                throw new RuntimeException(
                    'DB_ORIGEN=neon pero no hay DATABASE_URL en el .env. Pega ahi la cadena de conexion de Neon.'
                );
            }

            $partes = parse_url($url);
            if ($partes === false || empty($partes['host'])) {
                throw new RuntimeException('DATABASE_URL no es una cadena de conexion valida.');
            }

            return [
                'origen' => 'neon',
                'host' => $partes['host'],
                'puerto' => (int) ($partes['port'] ?? 5432),
                'usuario' => rawurldecode($partes['user'] ?? ''),
                'clave' => rawurldecode($partes['pass'] ?? ''),
                'nombre' => ltrim($partes['path'] ?? '', '/'),
                'ssl' => self::usaSsl($url),
            ];
        }

        return [
            'origen' => 'local',
            'host' => self::variable('DB_HOST') ?: 'localhost',
            'puerto' => (int) (self::variable('DB_PUERTO') ?: 5432),
            'usuario' => self::variable('DB_USUARIO') ?: 'sistema_juegos',
            'clave' => self::variable('DB_CLAVE') ?: 'sistema_juegos',
            'nombre' => self::variable('DB_NOMBRE') ?: 'sistema_juegos',
            'ssl' => self::variable('DB_SSL') === 'true',
        ];
    }

    /** El valor de DB_ORIGEN tal cual, en minusculas ("" si no esta). */
    public static function origenForzado(): string
    {
        return strtolower(trim((string) self::variable('DB_ORIGEN')));
    }

    /**
     * DB_SSL manda siempre; si no esta, se respeta el sslmode que venga en la
     * URL, que es como Neon entrega la suya.
     */
    private static function usaSsl(string $url): bool
    {
        $ssl = self::variable('DB_SSL');
        if ($ssl === 'true') {
            return true;
        }
        if ($ssl === 'false') {
            return false;
        }

        return (bool) preg_match('/sslmode=(require|verify-ca|verify-full)/', $url);
    }

    /**
     * El valor crudo, como texto. env() de Laravel convierte "true"/"false" a
     * booleanos y "" a null; aqui interesa el texto tal cual lo escribio el
     * usuario, igual que process.env en Node.
     */
    private static function variable(string $nombre): ?string
    {
        $valor = env($nombre);
        if ($valor === null) {
            return null;
        }
        if (is_bool($valor)) {
            return $valor ? 'true' : 'false';
        }

        return (string) $valor;
    }
}
