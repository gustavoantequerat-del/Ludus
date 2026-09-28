<?php

namespace App\Modulos\Solicitudes;

use App\Http\Controlador;
use Illuminate\Http\Request;

class SolicitudesControlador extends Controlador
{
    public function __construct(private readonly SolicitudesServicio $servicio) {}

    public function listar(Request $peticion)
    {
        return $this->servicio->listar($this->quien($peticion));
    }

    public function crear(Request $peticion)
    {
        $datos = $this->validar($peticion, [
            'tipo' => 'required|in:ingreso,salida',
            // Uno de los dos: un curso o una ruta.
            'cursoId' => 'required_without:rutaId|nullable|uuid',
            'rutaId' => 'required_without:cursoId|nullable|uuid',
        ]);

        return $this->servicio->crear($this->quien($peticion), $datos);
    }

    public function resolver(Request $peticion, string $id)
    {
        $datos = $this->validar($peticion, ['estado' => 'required|in:aprobada,rechazada']);

        return $this->servicio->resolver($this->quien($peticion), $id, $datos['estado']);
    }
}
