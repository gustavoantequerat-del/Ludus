<?php

namespace App\Modelos;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Un intento de un estudiante en el juego de un modulo. */
class Resultado extends ModeloBase
{
    protected $table = 'resultados';

    public const UPDATED_AT = null;

    // "nota" es numeric(4,1): sale como texto ("9.2"), igual que antes.
    protected $casts = ['intento' => 'integer', 'puntaje' => 'integer'];

    public function estudiante(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'estudiante_id');
    }

    public function modulo(): BelongsTo
    {
        return $this->belongsTo(ModuloCurso::class, 'modulo_id');
    }
}
