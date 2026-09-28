<?php

/*
 * La API no guarda nada en cache. El almacen en archivo solo evita que
 * Laravel busque una tabla "cache" que esta base no tiene.
 */
return [

    'default' => 'file',

    'stores' => [
        'file' => [
            'driver' => 'file',
            'path' => storage_path('framework/cache/data'),
            'lock_path' => storage_path('framework/cache/data'),
        ],
        'array' => [
            'driver' => 'array',
            'serialize' => false,
        ],
    ],

    'prefix' => 'ludus-cache-',

];
