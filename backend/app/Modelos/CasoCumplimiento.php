<?php

namespace App\Modelos;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un expediente de la Mesa de Cumplimiento: la solicitud que trae el CEO y la
 * decision que correspondia, con la explicacion que se muestra despues.
 *
 * Los seis campos del expediente son fijos porque son los que el curso usa
 * para decidir. Lo que no entra en esos seis va en campos_extra, para casos
 * que necesitan datos propios (hops, materialidad, modelo operativo).
 *
 * institucion_id en null es el catalogo base de Ludus, comun a todos.
 */
class CasoCumplimiento extends ModeloBase
{
    protected $table = 'casos_cumplimiento';

    protected $casts = ['campos_extra' => 'array', 'activo' => 'boolean'];

    public function personaje(): BelongsTo
    {
        return $this->belongsTo(Personaje::class, 'personaje_id');
    }
}
