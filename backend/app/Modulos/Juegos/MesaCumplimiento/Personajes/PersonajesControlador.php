<?php

namespace App\Modulos\Juegos\MesaCumplimiento\Personajes;

use App\Http\Controlador;
use Illuminate\Http\Request;

/* Los personajes son la escena de la Mesa de Cumplimiento, no un recurso suelto. */
class PersonajesControlador extends Controlador
{
    public function __construct(private readonly PersonajesServicio $servicio) {}

    public function listar(Request $peticion)
    {
        return $this->servicio->listar($this->quien($peticion));
    }

    public function disponibles()
    {
        return $this->servicio->imagenesDisponibles();
    }

    public function crear(Request $peticion)
    {
        return $this->servicio->crear($this->quien($peticion), $this->datos($peticion, true));
    }

    public function actualizar(Request $peticion, string $id)
    {
        return $this->servicio->actualizar($this->quien($peticion), $id, $this->datos($peticion, false));
    }

    public function eliminar(Request $peticion, string $id)
    {
        $this->servicio->eliminar($this->quien($peticion), $id);

        return $this->sinContenido();
    }

    private function datos(Request $peticion, bool $esNuevo): array
    {
        return $this->validar($peticion, [
            'nombre' => ($esNuevo ? 'required' : 'sometimes|required').'|string|min:2|max:120',
            'cargo' => ($esNuevo ? 'sometimes|nullable' : 'sometimes').'|string|max:120',
            // Imagen nueva como data URL (data:image/png;base64,...), cuando
            // el docente sube un archivo desde su computadora.
            'imagenSubida' => 'sometimes|nullable|string',
            // Imagen que ya esta en el servidor (/archivos/personajes/...).
            'imagenExistente' => 'sometimes|nullable|string|max:300',
        ]);
    }
}
