<?php

namespace App\Modelos;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Pedido de un estudiante para entrar a (o salir de) un curso o una ruta. */
class Solicitud extends ModeloBase
{
    public const INGRESO = 'ingreso';

    public const SALIDA = 'salida';

    public const PENDIENTE = 'pendiente';

    public const APROBADA = 'aprobada';

    public const RECHAZADA = 'rechazada';

    protected $table = 'solicitudes';

    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'estudiante_id');
    }

    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    public function ruta(): BelongsTo
    {
        return $this->belongsTo(Ruta::class, 'ruta_id');
    }
}
