<?php

namespace App\Modulos\Inscripciones;

use App\Http\Controlador;
use Illuminate\Http\Request;

class InscripcionesControlador extends Controlador
{
    private const REGLAS = [
        'estudianteIds' => 'present|array|list',
        'estudianteIds.*' => 'uuid',
    ];

    public function __construct(private readonly InscripcionesServicio $servicio) {}

    public function listarDeCurso(Request $peticion, string $cursoId)
    {
        return $this->servicio->listarDeCurso($this->quien($peticion), $cursoId);
    }

    public function asignarACurso(Request $peticion, string $cursoId)
    {
        $datos = $this->validar($peticion, self::REGLAS);

        return $this->servicio->asignarACurso($this->quien($peticion), $cursoId, $datos['estudianteIds']);
    }

    public function listarDeRuta(Request $peticion, string $rutaId)
    {
        return $this->servicio->listarDeRuta($this->quien($peticion), $rutaId);
    }

    public function asignarARuta(Request $peticion, string $rutaId)
    {
        $datos = $this->validar($peticion, self::REGLAS);

        return $this->servicio->asignarARuta($this->quien($peticion), $rutaId, $datos['estudianteIds']);
    }
}
