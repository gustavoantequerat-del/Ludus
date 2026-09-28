<?php

namespace App\Soporte;

use Illuminate\Support\Facades\DB;

/** Apoyo para las migraciones, que escriben el esquema en SQL tal cual. */
final class Migraciones
{
    /**
     * DEFAULT para las columnas id.
     *
     * La aplicacion genera los UUID en PHP, asi que la base no necesita
     * generarlos. Igual se deja un valor por defecto cuando es gratis
     * (PostgreSQL 13+ trae gen_random_uuid() sin extensiones), para que un
     * INSERT escrito a mano en pgAdmin tambien funcione. En versiones viejas,
     * comunes en cPanel, no se agrega: pediria instalar una extension, y eso
     * un usuario de hosting compartido no siempre puede.
     */
    public static function idPorDefecto(): string
    {
        $version = (int) DB::selectOne('SHOW server_version_num')->server_version_num;

        return $version >= 130000 ? 'DEFAULT gen_random_uuid()' : '';
    }
}
