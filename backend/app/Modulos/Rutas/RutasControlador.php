<?php

namespace App\Modulos\Rutas;

use App\Http\Controlador;
use Illuminate\Http\Request;

class RutasControlador extends Controlador
{
    public function __construct(private readonly RutasServicio $servicio) {}

    public function listar(Request $peticion)
    {
        return $this->servicio->listar($this->quien($peticion));
    }

    public function obtener(Request $peticion, string $id)
    {
        return $this->servicio->obtener($this->quien($peticion), $id);
    }

    public function crear(Request $peticion)
    {
        $datos = $this->validar($peticion, [
            'nombre' => 'required|string|min:2|max:140',
            'descripcion' => 'sometimes|nullable|string',
            // Solo el superadmin elige institucion; el resto usa la propia.
            'institucionId' => 'sometimes|nullable|uuid',
        ]);

        return $this->servicio->crear($this->quien($peticion), $datos);
    }

    public function actualizar(Request $peticion, string $id)
    {
        $datos = $this->validar($peticion, [
            'nombre' => 'sometimes|required|string|min:2|max:140',
            'descripcion' => 'sometimes|string',
            'institucionId' => 'sometimes|nullable|uuid',
        ]);

        return $this->servicio->actualizar($this->quien($peticion), $id, $datos);
    }

    public function eliminar(Request $peticion, string $id)
    {
        $this->servicio->eliminar($this->quien($peticion), $id);

        return $this->sinContenido();
    }

    public function agregarCurso(Request $peticion, string $id)
    {
        $datos = $this->validar($peticion, ['cursoId' => 'required|uuid']);

        return $this->servicio->agregarCurso($this->quien($peticion), $id, $datos['cursoId']);
    }

    public function quitarCurso(Request $peticion, string $id, string $cursoId)
    {
        $this->servicio->quitarCurso($this->quien($peticion), $id, $cursoId);

        return $this->sinContenido();
    }
}
