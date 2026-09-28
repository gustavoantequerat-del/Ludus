<?php

namespace App\Consola;

use Illuminate\Console\Command;

/**
 * Levanta la API en desarrollo en el puerto de PUERTO (3000 por defecto),
 * que es donde el frontend (Vite) la espera.
 *
 * Uso: php artisan servir
 */
class Servir extends Command
{
    protected $signature = 'servir';

    protected $description = 'Levanta la API en desarrollo (http://localhost:PUERTO/api)';

    public function handle(): int
    {
        return $this->call('serve', ['--host' => '127.0.0.1', '--port' => config('ludus.puerto')]);
    }
}
