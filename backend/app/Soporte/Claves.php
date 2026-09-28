<?php

namespace App\Soporte;

/**
 * Hash de contrasenas con bcrypt (costo 10, igual que antes).
 *
 * Las claves que ya estan en la base las genero Node y empiezan con $2b$;
 * PHP las valida sin problema. Las nuevas se guardan tambien con $2b$ (PHP
 * produce $2y$, que es el mismo algoritmo con otro prefijo) para que la
 * columna quede uniforme y cualquier libreria de bcrypt las entienda.
 */
final class Claves
{
    private const COSTO = 10;

    public static function hash(string $clave): string
    {
        $hash = password_hash($clave, PASSWORD_BCRYPT, ['cost' => self::COSTO]);

        return '$2b$'.substr($hash, 4);
    }

    public static function coincide(string $clave, string $hash): bool
    {
        // password_verify directo: Hash::check de Laravel rechaza el prefijo
        // $2b$ porque no lo reconoce como suyo.
        return password_verify($clave, $hash);
    }
}
