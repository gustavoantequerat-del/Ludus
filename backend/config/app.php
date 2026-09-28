<?php

/*
 * Solo lo que la API usa. Todo lo que no esta aqui toma el valor por defecto
 * de Laravel.
 */
return [

    'name' => 'Ludus',

    'env' => env('APP_ENV', 'production'),

    // En true los errores 500 traen el detalle en la respuesta. Nunca en
    // produccion: expone rutas y consultas.
    'debug' => (bool) env('APP_DEBUG', false),

    'url' => env('APP_URL', 'http://localhost'),

    'timezone' => 'UTC',

    'locale' => 'es',
    'fallback_locale' => 'es',
    'faker_locale' => 'es_ES',

    'cipher' => 'AES-256-CBC',

    /*
     * La API no usa sesiones ni cookies cifradas, pero Laravel exige una
     * clave. Si no se define APP_KEY se deriva de JWT_SECRETO, asi un
     * despliegue no necesita una variable mas.
     */
    'key' => env('APP_KEY') ?: 'base64:'.base64_encode(
        hash('sha256', (string) env('JWT_SECRETO', 'cambia-este-valor-en-produccion'), true)
    ),

    'previous_keys' => [],

    'maintenance' => [
        'driver' => 'file',
    ],

];
