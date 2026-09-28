<?php

namespace App\Modelos;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Paquete SCORM generado para un modulo. El token viaja dentro del ZIP que se
 * sube al LMS externo, asi que es un identificador publico: no da acceso por
 * si solo, el estudiante siempre tiene que iniciar sesion con su cuenta.
 */
class PaqueteScorm extends ModeloBase
{
    protected $table = 'paquetes_scorm';

    protected $casts = ['activo' => 'boolean'];

    public function modulo(): BelongsTo
    {
        return $this->belongsTo(ModuloCurso::class, 'modulo_id');
    }

    public function creadoPor(): BelongsTo
    {
        return $this->belongsTo(Usuario::class, 'creado_por_id');
    }
}
