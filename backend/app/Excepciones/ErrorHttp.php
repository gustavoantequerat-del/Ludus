<?php

namespace App\Excepciones;

use RuntimeException;

/**
 * Un error que la API devuelve tal cual al cliente, con su codigo HTTP. Es el
 * equivalente de las NotFoundException, ForbiddenException, ... de Nest, y se
 * responde con el mismo formato: { message, error, statusCode }.
 */
class ErrorHttp extends RuntimeException
{
    private const NOMBRES = [
        400 => 'Bad Request',
        401 => 'Unauthorized',
        403 => 'Forbidden',
        404 => 'Not Found',
        409 => 'Conflict',
        413 => 'Payload Too Large',
        500 => 'Internal Server Error',
    ];

    public function __construct(public readonly int $codigo, string $mensaje)
    {
        parent::__construct($mensaje);
    }

    public static function solicitudInvalida(string $mensaje): self
    {
        return new self(400, $mensaje);
    }

    public static function noAutorizado(string $mensaje = 'Unauthorized'): self
    {
        return new self(401, $mensaje);
    }

    public static function prohibido(string $mensaje = 'Forbidden resource'): self
    {
        return new self(403, $mensaje);
    }

    public static function noEncontrado(string $mensaje): self
    {
        return new self(404, $mensaje);
    }

    public static function conflicto(string $mensaje): self
    {
        return new self(409, $mensaje);
    }

    /** El cuerpo de la respuesta, con el formato que espera el frontend. */
    public static function cuerpo(int $codigo, string|array $mensaje): array
    {
        // Nest no manda "error" cuando el mensaje es solo el nombre del
        // codigo (401 "Unauthorized", 500 "Internal server error").
        $nombre = self::NOMBRES[$codigo] ?? 'Error';
        if (is_string($mensaje) && strcasecmp($mensaje, $nombre) === 0) {
            return ['message' => $mensaje, 'statusCode' => $codigo];
        }

        return ['message' => $mensaje, 'error' => $nombre, 'statusCode' => $codigo];
    }
}
