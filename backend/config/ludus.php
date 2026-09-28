<?php

/*
 * Configuracion propia de Ludus. Mismas variables de entorno que usaba el
 * backend en NestJS, para que un .env o un panel de hosting ya configurado
 * siga sirviendo sin cambios.
 */

$puerto = (int) (env('PUERTO') ?: env('PORT') ?: 3000);

return [

    // Solo para desarrollo (php artisan servir). En cPanel la API la sirve Apache.
    'puerto' => $puerto,

    'jwt' => [
        'secreto' => env('JWT_SECRETO') ?: 'cambia-este-valor-en-produccion',
        // Mismo formato que aceptaba Nest: "8h", "30m", "7d", "3600s"...
        'expiracion' => env('JWT_EXPIRACION') ?: '8h',
    ],

    /*
     * URL publica de esta API. El paquete SCORM se ejecuta dentro de otro
     * sitio (el LMS), asi que necesita una direccion absoluta y alcanzable
     * desde ahi.
     */
    'url_publica_api' => env('URL_PUBLICA_API') ?: "http://localhost:{$puerto}/api",

    /*
     * Carpeta en disco con las imagenes del juego (personajes y fondos). Se
     * sirve tal cual en /archivos, sin el prefijo /api: son estaticos, no
     * endpoints. Por defecto es public/archivos, que el servidor web entrega
     * directo sin pasar por PHP.
     */
    'ruta_archivos' => env('RUTA_ARCHIVOS') ?: public_path('archivos'),

    // Tope del cuerpo JSON: las imagenes de personajes viajan en base64.
    'limite_cuerpo_bytes' => 6 * 1024 * 1024,

];
