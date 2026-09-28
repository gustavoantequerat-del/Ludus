<?php

namespace App\Modelos;

class Institucion extends ModeloBase
{
    protected $table = 'instituciones';

    protected $casts = ['activa' => 'boolean'];
}
