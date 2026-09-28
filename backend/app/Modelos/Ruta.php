<?php

namespace App\Modelos;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ruta extends ModeloBase
{
    protected $table = 'rutas';

    public function institucion(): BelongsTo
    {
        return $this->belongsTo(Institucion::class, 'institucion_id');
    }

    /** Los cursos de la ruta, cada uno con su orden (tabla rutas_cursos). */
    public function cursos(): HasMany
    {
        return $this->hasMany(RutaCurso::class, 'ruta_id');
    }
}
