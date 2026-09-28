<?php

namespace App\Modelos;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Curso extends ModeloBase
{
    protected $table = 'cursos';

    public function institucion(): BelongsTo
    {
        return $this->belongsTo(Institucion::class, 'institucion_id');
    }

    public function docente(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'docente_id');
    }

    public function modulos(): HasMany
    {
        return $this->hasMany(ModuloCurso::class, 'curso_id');
    }
}
