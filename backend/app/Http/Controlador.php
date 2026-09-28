<?php

namespace App\Http;

use App\Soporte\UsuarioAutenticado;
use App\Soporte\Validacion;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Lo que comparten todos los controladores. */
abstract class Controlador
{
    /** Quien hace la peticion; lo deja ahi el middleware AutenticarJwt. */
    protected function quien(Request $peticion): UsuarioAutenticado
    {
        return $peticion->attributes->get('usuario');
    }

    protected function validar(Request $peticion, array $reglas): array
    {
        return Validacion::cuerpo($peticion, $reglas);
    }

    /**
     * Respuesta sin cuerpo. Es lo que devolvia Nest cuando el metodo no
     * retornaba nada (200 vacio), o 204 donde se pedia explicitamente.
     */
    protected function sinContenido(int $codigo = 200): Response
    {
        return response('', $codigo);
    }
}
