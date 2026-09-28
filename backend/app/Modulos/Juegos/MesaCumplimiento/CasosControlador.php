<?php

namespace App\Modulos\Juegos\MesaCumplimiento;

use App\Http\Controlador;
use Illuminate\Http\Request;

/*
 * Bajo la ruta del juego: estos casos son el contenido de la Mesa de
 * Cumplimiento, no un recurso suelto del sistema. Otro juego jugable tendra
 * su propio editor y sus propias tablas.
 */
class CasosControlador extends Controlador
{
    public function __construct(private readonly CasosServicio $servicio) {}

    public function listar(Request $peticion)
    {
        return $this->servicio->listar($this->quien($peticion));
    }

    public function crear(Request $peticion)
    {
        return $this->servicio->crear($this->quien($peticion), $this->datos($peticion, true));
    }

    public function duplicarBase(Request $peticion)
    {
        $datos = $this->validar($peticion, [
            'ids' => 'sometimes|nullable|array|list|min:1',
            'ids.*' => 'uuid',
        ]);

        return $this->servicio->duplicarBase($this->quien($peticion), $datos['ids'] ?? null);
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
        $obligatorio = $esNuevo ? 'required' : 'sometimes|required';

        return $this->validar($peticion, [
            'entidad' => "{$obligatorio}|string|min:2|max:160",
            'tipo' => 'sometimes|string|max:160',
            'jurisdiccion' => 'sometimes|string|max:160',
            'solicitud' => 'sometimes|string|max:200',
            // Los seis campos del expediente.
            'registroLicencia' => 'sometimes|string',
            'travelRule' => 'sometimes|string',
            'beneficiarioFinal' => 'sometimes|string',
            'controlesAml' => 'sometimes|string',
            'sanciones' => 'sometimes|string',
            'exposicionOnchain' => 'sometimes|string',
            'camposExtra' => 'sometimes|array|list',
            'camposExtra.*' => 'array',
            'camposExtra.*.etiqueta' => 'required|string|min:1|max:60',
            'camposExtra.*.valor' => 'present|string|max:400',
            // Respuesta y retroalimentacion.
            'decisionCorrecta' => "{$obligatorio}|in:aprobar,reforzar,rechazar",
            'regla' => 'sometimes|string|max:200',
            'explicacion' => 'sometimes|string',
            'origen' => 'sometimes|string|max:160',
            // Personaje en escena; null deja la silueta neutra.
            'personajeId' => 'sometimes|nullable|uuid',
            'activo' => 'sometimes|boolean',
        ]);
    }
}
