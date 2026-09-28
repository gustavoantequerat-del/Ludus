<?php

namespace App\Modulos\Usuarios;

use App\Http\Controlador;
use App\Soporte\Rol;
use App\Soporte\Validacion;
use Illuminate\Http\Request;

class UsuariosControlador extends Controlador
{
    public function __construct(private readonly UsuariosServicio $servicio) {}

    public function listar(Request $peticion)
    {
        $filtro = Validacion::consulta($peticion, ['rol' => 'sometimes|in:'.implode(',', Rol::TODOS)]);

        return $this->servicio->listar($this->quien($peticion), $filtro['rol'] ?? null);
    }

    public function obtener(Request $peticion, string $id)
    {
        return $this->servicio->obtener($this->quien($peticion), $id);
    }

    public function crear(Request $peticion)
    {
        $datos = $this->validar($peticion, [
            'nombre' => 'required|string|min:2|max:120',
            'correo' => 'required|string|max:160',
            'clave' => 'required|string|min:6|max:72',
            'rol' => 'required|in:'.implode(',', Rol::TODOS),
            'institucionId' => 'sometimes|nullable|uuid',
        ]);

        return $this->servicio->crear($this->quien($peticion), $datos);
    }

    public function actualizar(Request $peticion, string $id)
    {
        $datos = $this->validar($peticion, [
            'nombre' => 'sometimes|required|string|min:2|max:120',
            'correo' => 'sometimes|required|string|max:160',
            'rol' => 'sometimes|required|in:'.implode(',', Rol::TODOS),
            'institucionId' => 'sometimes|nullable|uuid',
            'activo' => 'sometimes|boolean',
        ]);
        if (array_key_exists('activo', $datos)) {
            $datos['activo'] = (bool) $datos['activo'];
        }

        return $this->servicio->actualizar($this->quien($peticion), $id, $datos);
    }

    public function eliminar(Request $peticion, string $id)
    {
        $this->servicio->eliminar($this->quien($peticion), $id);

        return $this->sinContenido();
    }
}
