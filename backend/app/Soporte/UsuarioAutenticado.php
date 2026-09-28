<?php

namespace App\Soporte;

/**
 * Quien hace la peticion, tal como viene en el token. No se consulta la base
 * en cada peticion: el token ya lo trae firmado.
 */
final class UsuarioAutenticado
{
    /** Un UUID que no es de nadie: filtrar por el no devuelve filas. */
    private const NINGUNA_INSTITUCION = '00000000-0000-0000-0000-000000000000';

    public function __construct(
        public readonly string $id,
        public readonly string $correo,
        public readonly string $nombre,
        public readonly string $rol,
        public readonly ?string $institucionId,
    ) {}

    public static function desdeCarga(array $carga): self
    {
        return new self(
            (string) ($carga['sub'] ?? ''),
            (string) ($carga['correo'] ?? ''),
            (string) ($carga['nombre'] ?? ''),
            (string) ($carga['rol'] ?? ''),
            isset($carga['institucionId']) ? (string) $carga['institucionId'] : null,
        );
    }

    public function es(string $rol): bool
    {
        return $this->rol === $rol;
    }

    /**
     * La institucion para filtrar una consulta ("solo lo de mi institucion").
     * Un usuario sin institucion no ve nada, en vez de ver lo que tampoco
     * tiene institucion.
     */
    public function institucionParaFiltrar(): string
    {
        return $this->institucionId ?? self::NINGUNA_INSTITUCION;
    }

    /** Lo que devuelve GET /autenticacion/perfil. */
    public function aArreglo(): array
    {
        return [
            'id' => $this->id,
            'correo' => $this->correo,
            'nombre' => $this->nombre,
            'rol' => $this->rol,
            'institucionId' => $this->institucionId,
        ];
    }
}
