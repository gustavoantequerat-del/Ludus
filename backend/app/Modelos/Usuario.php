<?php

namespace App\Modelos;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Usuario extends ModeloBase
{
    protected $table = 'usuarios';

    /** El hash de la clave nunca sale en una respuesta. */
    protected $hidden = ['clave_hash'];

    protected $casts = ['activo' => 'boolean'];

    public function institucion(): BelongsTo
    {
        return $this->belongsTo(Institucion::class, 'institucion_id');
    }
}
