<?php

/*
 * La API no usa el sistema de archivos de Laravel (las imagenes del juego van
 * por RUTA_ARCHIVOS). Solo se desactiva la ruta /storage que Laravel publica
 * por defecto.
 */
return [

    'default' => 'local',

    'disks' => [
        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => false,
            'throw' => false,
        ],
    ],

];
