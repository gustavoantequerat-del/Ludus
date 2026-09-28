<?php

namespace App\Soporte;

use RuntimeException;

/**
 * JWT HS256, compatible con los tokens que emitia el backend en NestJS: mismo
 * secreto (JWT_SECRETO), misma carga y mismo formato de expiracion. Una sesion
 * abierta antes de la migracion sigue valiendo despues.
 *
 * Son cuarenta lineas de codigo; no justifican una dependencia.
 */
final class Jwt
{
    public static function firmar(array $carga): string
    {
        $ahora = time();
        $carga['iat'] = $ahora;
        $carga['exp'] = $ahora + self::segundosDeExpiracion(config('ludus.jwt.expiracion'));

        $cabecera = self::base64Url(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $cuerpo = self::base64Url(json_encode($carga, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

        return "{$cabecera}.{$cuerpo}.".self::firma("{$cabecera}.{$cuerpo}");
    }

    /** La carga si el token es valido y no vencio; null en cualquier otro caso. */
    public static function verificar(string $token): ?array
    {
        $partes = explode('.', $token);
        if (count($partes) !== 3) {
            return null;
        }
        [$cabecera, $cuerpo, $firma] = $partes;

        $datosCabecera = json_decode(self::desdeBase64Url($cabecera), true);
        if (($datosCabecera['alg'] ?? null) !== 'HS256') {
            return null;
        }
        if (! hash_equals(self::firma("{$cabecera}.{$cuerpo}"), $firma)) {
            return null;
        }

        $carga = json_decode(self::desdeBase64Url($cuerpo), true);
        if (! is_array($carga)) {
            return null;
        }
        if (isset($carga['exp']) && time() >= (int) $carga['exp']) {
            return null;
        }

        return $carga;
    }

    /**
     * Interpreta la expiracion como lo hacia jsonwebtoken (libreria "ms"):
     * "8h", "30m", "7d", "2 days". Un numero sin unidad son milisegundos.
     */
    public static function segundosDeExpiracion(string $texto): int
    {
        $patron = '/^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i';
        if (! preg_match($patron, trim($texto), $partes)) {
            throw new RuntimeException("JWT_EXPIRACION=\"{$texto}\" no tiene un formato valido. Ejemplos: 8h, 30m, 7d.");
        }

        $cantidad = (float) $partes[1];
        $unidad = strtolower($partes[2] ?? 'ms');
        $segundosPorUnidad = match (true) {
            in_array($unidad, ['years', 'year', 'yrs', 'yr', 'y']) => 365.25 * 86400,
            in_array($unidad, ['weeks', 'week', 'w']) => 7 * 86400,
            in_array($unidad, ['days', 'day', 'd']) => 86400,
            in_array($unidad, ['hours', 'hour', 'hrs', 'hr', 'h']) => 3600,
            in_array($unidad, ['minutes', 'minute', 'mins', 'min', 'm']) => 60,
            in_array($unidad, ['seconds', 'second', 'secs', 'sec', 's']) => 1,
            default => 0.001,
        };

        return (int) floor($cantidad * $segundosPorUnidad);
    }

    private static function firma(string $contenido): string
    {
        return self::base64Url(hash_hmac('sha256', $contenido, config('ludus.jwt.secreto'), true));
    }

    private static function base64Url(string $datos): string
    {
        return rtrim(strtr(base64_encode($datos), '+/', '-_'), '=');
    }

    private static function desdeBase64Url(string $datos): string
    {
        return (string) base64_decode(strtr($datos, '-_', '+/'), true);
    }
}
