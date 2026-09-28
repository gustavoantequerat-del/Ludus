<?php

namespace App\Modulos\Resultados;

use App\Http\Controlador;
use Illuminate\Http\Request;

class ResultadosControlador extends Controlador
{
    public function __construct(private readonly ResultadosServicio $servicio) {}

    public function listar(Request $peticion)
    {
        return $this->servicio->listar($this->quien($peticion));
    }

    public function crear(Request $peticion)
    {
        $datos = $this->validar($peticion, [
            'moduloId' => 'required|uuid',
            'puntaje' => 'required|integer|min:0|max:1000',
        ]);

        return $this->servicio->crear($this->quien($peticion), $datos['moduloId'], (int) $datos['puntaje']);
    }
}
