<?php

/*
 * Fuera de /api solo estan las imagenes del juego, en /archivos.
 *
 * Con RUTA_ARCHIVOS por defecto (public/archivos) el servidor web las entrega
 * directo y esta ruta nunca se usa; existe para cuando las imagenes viven en
 * otra carpeta del disco.
 */

use App\Modulos\Archivos\ArchivosControlador;
use Illuminate\Support\Facades\Route;

Route::get('archivos/{ruta}', [ArchivosControlador::class, 'servir'])->where('ruta', '.*');
