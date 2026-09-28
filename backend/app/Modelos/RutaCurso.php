<?php

namespace App\Modelos;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RutaCurso extends ModeloBase
{
    protected $table = 'rutas_cursos';

    public $timestamps = false;

    protected $casts = ['orden' => 'integer'];

    public function ruta(): BelongsTo
    {
        return $this->belongsTo(Ruta::class, 'ruta_id');
    }

    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }
}
