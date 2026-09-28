<?php

namespace App\Modulos\Archivos;

use App\Excepciones\ErrorHttp;
use Illuminate\Http\Request;

/**
 * Sirve /archivos/... cuando RUTA_ARCHIVOS apunta fuera de public/.
 *
 * Con la configuracion por defecto (public/archivos) este controlador ni se
 * entera: Apache (o `php artisan serve`) entrega el archivo directo.
 */
class ArchivosControlador
{
    public function __construct(private readonly ArchivosServicio $archivos) {}

    public function servir(Request $peticion, string $ruta)
    {
        $archivo = $this->archivos->rutaEnDisco(ArchivosServicio::BASE_PUBLICA.'/'.$ruta);
        if ($archivo === null || ! is_file($archivo)) {
            throw ErrorHttp::noEncontrado("Cannot GET {$peticion->getPathInfo()}");
        }

        return response()->file($archivo, ['Cache-Control' => 'public, max-age=0']);
    }
}
