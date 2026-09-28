<?php

namespace App\Http\Middleware;

use App\Excepciones\ErrorHttp;
use Closure;
use Illuminate\Http\Request;

/**
 * Deja pasar solo a los roles indicados en la ruta: ->middleware('rol:docente,estudiante').
 * Va siempre despues de AutenticarJwt.
 */
class ExigirRol
{
    public function handle(Request $peticion, Closure $siguiente, string ...$roles)
    {
        $usuario = $peticion->attributes->get('usuario');
        if (! $usuario || ! in_array($usuario->rol, $roles, true)) {
            throw ErrorHttp::prohibido();
        }

        return $siguiente($peticion);
    }
}
