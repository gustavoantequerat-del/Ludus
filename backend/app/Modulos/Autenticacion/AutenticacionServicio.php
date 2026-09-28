<?php

namespace App\Modulos\Autenticacion;

use App\Excepciones\ErrorHttp;
use App\Modelos\Usuario;
use App\Modulos\Usuarios\UsuariosServicio;
use App\Soporte\Claves;
use App\Soporte\Jwt;

class AutenticacionServicio
{
    public function __construct(private readonly UsuariosServicio $usuarios) {}

    public function ingresar(string $correo, string $clave): array
    {
        $usuario = Usuario::where('correo', $correo)->first();
        if (! $usuario || ! $usuario->activo) {
            throw ErrorHttp::noAutorizado('Correo o contrasena invalidos');
        }
        if (! Claves::coincide($clave, $usuario->clave_hash)) {
            throw ErrorHttp::noAutorizado('Correo o contrasena invalidos');
        }

        return $this->construirSesion($usuario);
    }

    /**
     * El token lleva nombre y correo, asi que al editar el perfil hay que
     * reemitirlo para que la sesion no quede con datos viejos.
     */
    public function actualizarPerfil(string $id, array $datos): array
    {
        return $this->construirSesion($this->usuarios->actualizarPerfil($id, $datos));
    }

    public function cambiarClave(string $id, string $claveActual, string $claveNueva): void
    {
        $this->usuarios->cambiarClave($id, $claveActual, $claveNueva);
    }

    private function construirSesion(Usuario $usuario): array
    {
        $carga = [
            'sub' => $usuario->id,
            'correo' => $usuario->correo,
            'nombre' => $usuario->nombre,
            'rol' => $usuario->rol,
            'institucionId' => $usuario->institucion_id,
        ];

        return ['tokenAcceso' => Jwt::firmar($carga), 'usuario' => $carga];
    }
}
