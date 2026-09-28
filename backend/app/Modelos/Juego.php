<?php

namespace App\Modelos;

/**
 * Catalogo fijo de plantillas de juego programadas por el equipo de
 * desarrollo. No tiene CRUD de usuario: se administra por semilla/migracion.
 *
 * "clave" es el identificador estable de la plantilla: el frontend y el
 * paquete SCORM lo usan para saber que juego renderizar. "jugable" es false
 * mientras el juego siga siendo solo maqueta visual.
 */
class Juego extends ModeloBase
{
    public const CLAVE_MESA_CUMPLIMIENTO = 'mesa-cumplimiento';

    protected $table = 'juegos';

    public $timestamps = false;

    protected $casts = ['parametros' => 'array', 'jugable' => 'boolean'];
}
