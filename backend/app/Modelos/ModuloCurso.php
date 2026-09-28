<?php

namespace App\Modelos;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ModuloCurso extends ModeloBase
{
    protected $table = 'modulos_curso';

    protected $casts = ['orden' => 'integer', 'califica' => 'boolean'];

    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    public function configuracionJuego(): HasOne
    {
        return $this->hasOne(ConfiguracionJuego::class, 'modulo_id');
    }
}
