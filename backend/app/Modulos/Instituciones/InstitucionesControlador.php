<?php

namespace App\Modulos\Instituciones;

use App\Http\Controlador;
use Illuminate\Http\Request;

class InstitucionesControlador extends Controlador
{
    public function __construct(private readonly InstitucionesServicio $servicio) {}

    public function listar()
    {
        return $this->servicio->listar();
    }

    public function obtener(string $id)
    {
        return $this->servicio->obtener($id);
    }

    public function crear(Request $peticion)
    {
        return $this->servicio->crear($this->datos($peticion, true));
    }

    public function actualizar(Request $peticion, string $id)
    {
        return $this->servicio->actualizar($id, $this->datos($peticion, false));
    }

    public function eliminar(string $id)
    {
        $this->servicio->eliminar($id);

        return $this->sinContenido();
    }

    private function datos(Request $peticion, bool $esNueva): array
    {
        $obligatorio = $esNueva ? 'required' : 'sometimes|required';
        $datos = $this->validar($peticion, [
            'nombre' => "{$obligatorio}|string|min:2|max:120",
            'dominio' => "{$obligatorio}|string|min:3|max:160",
            'activa' => 'sometimes|boolean',
        ]);
        if (array_key_exists('activa', $datos)) {
            $datos['activa'] = (bool) $datos['activa'];
        }

        return $datos;
    }
}
