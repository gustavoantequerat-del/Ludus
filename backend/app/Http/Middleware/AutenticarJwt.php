<?php

namespace App\Http\Middleware;

use App\Excepciones\ErrorHttp;
use App\Soporte\Jwt;
use App\Soporte\UsuarioAutenticado;
use Closure;
use Illuminate\Http\Request;

/**
 * Exige un token valido en "Authorization: Bearer ...". Si falta, esta mal
 * firmado o vencio, responde 401 y el frontend cierra la sesion.
 */
class AutenticarJwt
{
    public function handle(Request $peticion, Closure $siguiente)
    {
        $cabecera = (string) $peticion->header('Authorization', '');
        if (! preg_match('/^Bearer\s+(\S+)$/i', $cabecera, $partes)) {
            throw ErrorHttp::noAutorizado();
        }

        $carga = Jwt::verificar($partes[1]);
        if ($carga === null) {
            throw ErrorHttp::noAutorizado();
        }

        $peticion->attributes->set('usuario', UsuarioAutenticado::desdeCarga($carga));

        return $siguiente($peticion);
    }
}
