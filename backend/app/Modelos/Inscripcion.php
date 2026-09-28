<?php

namespace App\Modelos;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un estudiante inscrito en un curso o en una ruta (no ambos a la vez en el
 * mismo registro). El curso es independiente de las rutas; una ruta agrupa
 * cursos que ya existen.
 */
class Inscripcion extends ModeloBase
{
    protected $table = 'inscripciones';

    public const UPDATED_AT = null;

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
