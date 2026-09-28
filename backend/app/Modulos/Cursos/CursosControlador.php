<?php

namespace App\Modulos\Cursos;

use App\Http\Controlador;
use Illuminate\Http\Request;

class CursosControlador extends Controlador
{
    public function __construct(private readonly CursosServicio $servicio) {}

    public function listar(Request $peticion)
    {
        return $this->servicio->listar($this->quien($peticion));
    }

    public function explorar(Request $peticion)
    {
        return $this->servicio->explorar($this->quien($peticion));
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
            // Si quien crea es docente, se usa su propio id.
            'docenteId' => 'sometimes|nullable|uuid',
        ]);

        return $this->servicio->crear($this->quien($peticion), $datos);
    }

    public function actualizar(Request $peticion, string $id)
    {
        $datos = $this->validar($peticion, [
            'nombre' => 'sometimes|required|string|min:2|max:140',
            'descripcion' => 'sometimes|string',
            'institucionId' => 'sometimes|nullable|uuid',
            'docenteId' => 'sometimes|nullable|uuid',
        ]);

        return $this->servicio->actualizar($this->quien($peticion), $id, $datos);
    }

    public function eliminar(Request $peticion, string $id)
    {
        $this->servicio->eliminar($this->quien($peticion), $id);

        return $this->sinContenido();
    }

    public function crearModulo(Request $peticion, string $id)
    {
        $datos = $this->validar($peticion, [
            'titulo' => 'required|string|min:2|max:140',
            'descripcion' => 'sometimes|nullable|string',
            'califica' => 'sometimes|nullable|boolean',
        ]);
        if (isset($datos['califica'])) {
            $datos['califica'] = (bool) $datos['califica'];
        }

        return $this->servicio->crearModulo($this->quien($peticion), $id, $datos);
    }

    public function actualizarModulo(Request $peticion, string $id, string $moduloId)
    {
        $datos = $this->validar($peticion, [
            'titulo' => 'sometimes|required|string|min:2|max:140',
            'descripcion' => 'sometimes|string',
            'califica' => 'sometimes|boolean',
        ]);
        if (isset($datos['califica'])) {
            $datos['califica'] = (bool) $datos['califica'];
        }

        return $this->servicio->actualizarModulo($this->quien($peticion), $id, $moduloId, $datos);
    }

    public function eliminarModulo(Request $peticion, string $id, string $moduloId)
    {
        $this->servicio->eliminarModulo($this->quien($peticion), $id, $moduloId);

        return $this->sinContenido();
    }

    public function moverModulo(Request $peticion, string $id, string $moduloId)
    {
        $datos = $this->validar($peticion, ['direccion' => 'required|in:arriba,abajo']);
        $this->servicio->moverModulo($this->quien($peticion), $id, $moduloId, $datos['direccion']);

        return $this->sinContenido();
    }
}
