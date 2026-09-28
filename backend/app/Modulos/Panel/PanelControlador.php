<?php

namespace App\Modulos\Panel;

use App\Http\Controlador;
use Illuminate\Http\Request;

class PanelControlador extends Controlador
{
    public function __construct(private readonly PanelServicio $servicio) {}

    public function resumen(Request $peticion)
    {
        return $this->servicio->resumen($this->quien($peticion));
    }

    public function actividad()
    {
        return $this->servicio->actividadReciente();
    }
}
