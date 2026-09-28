<?php

namespace App\Modelos;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Que juego usa un modulo y con que parametros. Uno por modulo. */
class ConfiguracionJuego extends ModeloBase
{
    protected $table = 'configuraciones_juego';

    protected $casts = [
        'tiempo_limite_segundos' => 'integer',
        'pares_contenido' => 'integer',
        'intentos_permitidos' => 'integer',
        'puntaje_maximo' => 'integer',
    ];

    public function modulo(): BelongsTo
    {
        return $this->belongsTo(ModuloCurso::class, 'modulo_id');
    }

    public function juego(): BelongsTo
    {
        return $this->belongsTo(Juego::class, 'juego_id');
    }
}
