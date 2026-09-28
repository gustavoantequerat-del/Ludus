<?php

/*
 * Igual que app.enableCors() de Nest: cualquier origen puede llamar a la API.
 * Hace falta porque el frontend puede vivir en otro dominio y porque el
 * paquete SCORM se ejecuta dentro del sitio del LMS.
 *
 * Content-Disposition se expone para que el navegador pueda leer el nombre
 * del ZIP del paquete SCORM al descargarlo desde otro dominio.
 */
return [

    'paths' => ['api/*', 'archivos/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['Content-Disposition'],

    'max_age' => 0,

    'supports_credentials' => false,

];
