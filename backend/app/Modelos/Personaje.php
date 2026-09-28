<?php

namespace App\Modelos;

/**
 * Persona que aparece en escena frente al jugador (el "CEO" que viene a
 * presentar su expediente). "imagen" es la ruta publica (/archivos/...).
 *
 * institucion_id en null es el catalogo base de Ludus: lo ven todas las
 * instituciones y solo el superadmin lo edita.
 */
class Personaje extends ModeloBase
{
    protected $table = 'personajes';
}
