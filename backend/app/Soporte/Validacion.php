<?php

namespace App\Soporte;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Valida lo que manda el cliente como lo hacia el ValidationPipe de Nest
 * (whitelist + forbidNonWhitelisted): reglas por campo y, ademas, rechazo de
 * cualquier propiedad que el endpoint no espera. Asi nadie cuela campos que
 * no debe tocar (el rol, la institucion) por el cuerpo de la peticion.
 *
 * Devuelve solo los campos validados. Un campo que no vino no aparece en el
 * resultado, que es como se distingue "no tocar" de "vaciar".
 */
final class Validacion
{
    public static function cuerpo(Request $peticion, array $reglas): array
    {
        $datos = $peticion->isJson() ? $peticion->json()->all() : $peticion->request->all();

        return self::datos($datos, $reglas);
    }

    public static function consulta(Request $peticion, array $reglas): array
    {
        return self::datos($peticion->query->all(), $reglas);
    }

    public static function datos(array $datos, array $reglas): array
    {
        $validador = Validator::make($datos, $reglas);

        $conocidas = array_unique(array_map(fn ($clave) => explode('.', $clave)[0], array_keys($reglas)));
        $sobrantes = array_diff(array_keys($datos), $conocidas);

        $validador->after(function ($validador) use ($sobrantes) {
            foreach ($sobrantes as $propiedad) {
                $validador->errors()->add(
                    $propiedad,
                    trans('validation.propiedad_no_permitida', ['attribute' => $propiedad])
                );
            }
        });

        if ($validador->fails()) {
            throw new ValidationException($validador);
        }

        return $validador->validated();
    }
}
