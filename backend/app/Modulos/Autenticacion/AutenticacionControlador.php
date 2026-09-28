<?php

namespace App\Modulos\Autenticacion;

use App\Http\Controlador;
use Illuminate\Http\Request;

class AutenticacionControlador extends Controlador
{
    /** Tambien lo usa el login del paquete SCORM. */
    public const REGLAS_INGRESO = [
        'correo' => 'required|string|max:160',
        'clave' => 'required|string|min:6|max:72',
    ];

    public function __construct(private readonly AutenticacionServicio $servicio) {}

    public function ingresar(Request $peticion)
    {
        $datos = $this->validar($peticion, self::REGLAS_INGRESO);

        return $this->servicio->ingresar($datos['correo'], $datos['clave']);
    }

    public function perfil(Request $peticion)
    {
        return $this->quien($peticion)->aArreglo();
    }

    public function actualizarPerfil(Request $peticion)
    {
        $datos = $this->validar($peticion, [
            'nombre' => 'sometimes|nullable|string|min:2|max:120',
            'correo' => 'sometimes|nullable|string|max:160',
        ]);

        return $this->servicio->actualizarPerfil($this->quien($peticion)->id, $datos);
    }

    public function cambiarClave(Request $peticion)
    {
        $datos = $this->validar($peticion, [
            'claveActual' => 'required|string|min:6|max:72',
            'claveNueva' => 'required|string|min:6|max:72',
        ]);

        $this->servicio->cambiarClave($this->quien($peticion)->id, $datos['claveActual'], $datos['claveNueva']);

        return $this->sinContenido(204);
    }
}
