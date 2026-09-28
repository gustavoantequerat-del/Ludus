<?php

namespace App\Modulos\Scorm;

use App\Http\Controlador;
use App\Modulos\Autenticacion\AutenticacionControlador;
use App\Modulos\Juegos\JuegosControlador;
use Illuminate\Http\Request;

class ScormControlador extends Controlador
{
    public function __construct(private readonly ScormServicio $servicio) {}

    /* --- Paquetes: los administra quien puede editar el curso --- */

    public function listar(Request $peticion)
    {
        return $this->servicio->listar($this->quien($peticion));
    }

    /** A que direccion van a apuntar los paquetes, y si esa direccion sirve. */
    public function diagnostico()
    {
        return $this->servicio->diagnostico();
    }

    public function crear(Request $peticion)
    {
        $datos = $this->validar($peticion, ['moduloId' => 'required|uuid']);

        return $this->servicio->crear($this->quien($peticion), $datos['moduloId']);
    }

    public function descargar(Request $peticion, string $id)
    {
        ['nombreArchivo' => $nombre, 'contenido' => $contenido] = $this->servicio->generarZip($this->quien($peticion), $id);

        return response($contenido, 200, [
            'Content-Type' => 'application/zip',
            'Content-Disposition' => "attachment; filename=\"{$nombre}\"",
        ]);
    }

    public function cambiarEstado(Request $peticion, string $id)
    {
        $datos = $this->validar($peticion, ['activo' => 'required|boolean']);

        return $this->servicio->cambiarEstado($this->quien($peticion), $id, (bool) $datos['activo']);
    }

    public function eliminar(Request $peticion, string $id)
    {
        $this->servicio->eliminar($this->quien($peticion), $id);

        return $this->sinContenido();
    }

    /* --- Ejecucion dentro del LMS: el paquete llama a estas rutas --- */

    public function informacionPublica(string $token)
    {
        return $this->servicio->informacionPublica($token);
    }

    public function ingresar(Request $peticion, string $token)
    {
        $datos = $this->validar($peticion, AutenticacionControlador::REGLAS_INGRESO);

        return $this->servicio->ingresar($token, $datos['correo'], $datos['clave']);
    }

    public function armarPartida(Request $peticion, string $token)
    {
        return $this->servicio->armarPartida($token, $this->quien($peticion));
    }

    public function verificarCaso(Request $peticion)
    {
        $datos = $this->validar($peticion, JuegosControlador::REGLAS_VERIFICAR);

        return $this->servicio->verificarCaso($datos['casoId'], $datos['decision']);
    }

    public function terminarPartida(Request $peticion, string $token)
    {
        $datos = $this->validar($peticion, JuegosControlador::REGLAS_TERMINAR);

        return $this->servicio->terminarPartida($token, $this->quien($peticion), JuegosControlador::respuestas($datos));
    }

    public function registrarResultado(Request $peticion, string $token)
    {
        $datos = $this->validar($peticion, ['puntaje' => 'required|integer|min:0|max:1000']);

        return $this->servicio->registrarResultado($token, $this->quien($peticion), (int) $datos['puntaje']);
    }
}
