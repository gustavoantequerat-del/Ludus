<?php

namespace App\Providers;

use App\Soporte\ConectorPostgres;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Conector propio para PostgreSQL: agrega el timeout de conexion y el
        // endpoint de Neon cuando la libpq del hosting no manda SNI.
        $this->app->bind('db.connector.pgsql', ConectorPostgres::class);
    }

    public function boot(): void
    {
        //
    }
}
