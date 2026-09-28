<?php

namespace App\Http\Middleware;

use App\Excepciones\ErrorHttp;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Detalles de la API que el frontend y los paquetes SCORM ya conocen del
 * backend anterior:
 *
 * - Tope de 6 MB por peticion (las imagenes de personajes viajan en base64).
 * - Un POST que sale bien responde 201, no 200.
 * - JSON sin escapar barras ni acentos, igual que JSON.stringify.
 */
class AjustarRespuesta
{
    public function handle(Request $peticion, Closure $siguiente)
    {
        $limite = config('ludus.limite_cuerpo_bytes');
        if ((int) $peticion->header('Content-Length', 0) > $limite) {
            throw new ErrorHttp(413, 'request entity too large');
        }

        $respuesta = $siguiente($peticion);

        if ($peticion->isMethod('POST') && $respuesta->getStatusCode() === 200) {
            $respuesta->setStatusCode(201);
        }
        if ($respuesta instanceof JsonResponse) {
            $respuesta->setEncodingOptions(JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        return $respuesta;
    }
}
