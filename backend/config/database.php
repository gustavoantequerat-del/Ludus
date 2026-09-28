<?php

use App\Soporte\ConexionBd;

/*
 * Solo PostgreSQL. Que base se usa (local o Neon) lo decide ConexionBd a
 * partir del .env, con las mismas variables que el backend anterior.
 */
try {
    $conexion = ConexionBd::leer();
    $errorDeConfiguracion = null;
} catch (RuntimeException $falla) {
    // Un .env mal armado (DB_ORIGEN invalido, neon sin DATABASE_URL) no corta
    // la carga de Laravel: el mensaje sale al intentar conectar, en la
    // respuesta, en storage/logs y en bd:verificar.
    $conexion = ['origen' => 'local', 'host' => '', 'puerto' => 5432, 'usuario' => '', 'clave' => '', 'nombre' => '', 'ssl' => false];
    $errorDeConfiguracion = $falla->getMessage();
}

return [

    'default' => 'pgsql',

    'connections' => [

        'pgsql' => [
            'driver' => 'pgsql',
            'host' => $conexion['host'],
            'port' => $conexion['puerto'],
            'database' => $conexion['nombre'],
            'username' => $conexion['usuario'],
            'password' => $conexion['clave'],
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            // "require" cifra sin validar el certificado, como el
            // rejectUnauthorized: false de antes: los hostings compartidos
            // suelen tener certificados autofirmados.
            'sslmode' => $conexion['ssl'] ? 'require' : 'disable',
            // Para que bd:verificar pueda decir cual se eligio y por que.
            'origen_ludus' => $conexion['origen'],
            'origen_forzado_ludus' => ConexionBd::origenForzado(),
            'error_ludus' => $errorDeConfiguracion,
        ],

    ],

    /*
     * La base que ya existe tiene su propia tabla "migrations" (la que usaba
     * TypeORM). Laravel lleva su registro aparte para no pisarla.
     */
    'migrations' => [
        'table' => 'migraciones_laravel',
        'update_date_on_publish' => true,
    ],

];
