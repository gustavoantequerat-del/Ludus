<?php

namespace App\Modulos\Usuarios;

use App\Excepciones\ErrorHttp;
use App\Modelos\Usuario;
use App\Soporte\Claves;
use App\Soporte\Rol;
use App\Soporte\UsuarioAutenticado;

class UsuariosServicio
{
    public function listar(UsuarioAutenticado $quien, ?string $rol)
    {
        $consulta = Usuario::with('institucion')->orderBy('nombre');

        if (! $quien->es(Rol::SUPERADMIN)) {
            $consulta->where('institucion_id', $quien->institucionParaFiltrar());
        }
        if ($rol) {
            $consulta->where('rol', $rol);
        }

        return $consulta->get();
    }

    public function obtener(UsuarioAutenticado $quien, string $id): Usuario
    {
        $usuario = Usuario::with('institucion')->find($id);
        if (! $usuario) {
            throw ErrorHttp::noEncontrado('Usuario no encontrado');
        }
        $this->verificarAlcance($quien, $usuario);

        return $usuario;
    }

    public function crear(UsuarioAutenticado $quien, array $datos): Usuario
    {
        $institucionId = $this->resolverInstitucionParaCreacion($quien, $datos);
        $this->verificarRolPermitido($quien, $datos['rol']);
        $this->verificarCorreoLibre($datos['correo']);

        $usuario = Usuario::create([
            'nombre' => $datos['nombre'],
            'correo' => $datos['correo'],
            'clave_hash' => Claves::hash($datos['clave']),
            'rol' => $datos['rol'],
            'institucion_id' => $institucionId,
        ]);

        return $usuario->fresh();
    }

    public function actualizar(UsuarioAutenticado $quien, string $id, array $datos): Usuario
    {
        $usuario = $this->obtener($quien, $id);
        if (! empty($datos['rol'])) {
            $this->verificarRolPermitido($quien, $datos['rol']);
        }
        if (isset($datos['correo']) && $datos['correo'] !== $usuario->correo) {
            $this->verificarCorreoLibre($datos['correo']);
        }

        $columnas = ['nombre' => 'nombre', 'correo' => 'correo', 'rol' => 'rol', 'institucionId' => 'institucion_id', 'activo' => 'activo'];
        foreach ($columnas as $campo => $columna) {
            if (array_key_exists($campo, $datos)) {
                $usuario->$columna = $datos[$campo];
            }
        }
        $usuario->save();

        return $usuario->load('institucion');
    }

    public function eliminar(UsuarioAutenticado $quien, string $id): void
    {
        $this->obtener($quien, $id)->delete();
    }

    /** Datos propios del usuario que inicio sesion (nombre y correo). */
    public function actualizarPerfil(string $id, array $datos): Usuario
    {
        $usuario = Usuario::find($id);
        if (! $usuario) {
            throw ErrorHttp::noEncontrado('Usuario no encontrado');
        }

        if (! empty($datos['correo']) && $datos['correo'] !== $usuario->correo) {
            $this->verificarCorreoLibre($datos['correo']);
            $usuario->correo = $datos['correo'];
        }
        if (! empty($datos['nombre'])) {
            $usuario->nombre = $datos['nombre'];
        }
        $usuario->save();

        return $usuario;
    }

    /** Cambia la clave propia; exige conocer la clave actual. */
    public function cambiarClave(string $id, string $claveActual, string $claveNueva): void
    {
        $usuario = Usuario::find($id);
        if (! $usuario) {
            throw ErrorHttp::noEncontrado('Usuario no encontrado');
        }
        if (! Claves::coincide($claveActual, $usuario->clave_hash)) {
            throw ErrorHttp::noAutorizado('La contrasena actual no es correcta');
        }
        if ($claveActual === $claveNueva) {
            throw ErrorHttp::solicitudInvalida('La contrasena nueva debe ser distinta a la actual');
        }

        $usuario->clave_hash = Claves::hash($claveNueva);
        $usuario->save();
    }

    private function verificarCorreoLibre(string $correo): void
    {
        if (Usuario::where('correo', $correo)->exists()) {
            throw ErrorHttp::conflicto('Ya existe un usuario con ese correo');
        }
    }

    private function resolverInstitucionParaCreacion(UsuarioAutenticado $quien, array $datos): ?string
    {
        if ($quien->es(Rol::SUPERADMIN)) {
            if ($datos['rol'] === Rol::SUPERADMIN) {
                return null;
            }
            if (empty($datos['institucionId'])) {
                throw ErrorHttp::solicitudInvalida('Debes indicar la institucion del usuario');
            }

            return $datos['institucionId'];
        }
        if ($quien->es(Rol::ADMIN_INSTITUCION)) {
            return $quien->institucionId;
        }

        throw ErrorHttp::prohibido('No tienes permiso para crear usuarios');
    }

    private function verificarRolPermitido(UsuarioAutenticado $quien, string $rolObjetivo): void
    {
        if ($quien->es(Rol::SUPERADMIN)) {
            return;
        }
        if ($quien->es(Rol::ADMIN_INSTITUCION)) {
            if ($rolObjetivo === Rol::DOCENTE || $rolObjetivo === Rol::ESTUDIANTE) {
                return;
            }
            throw ErrorHttp::prohibido('Un administrador de institucion solo puede crear docentes y estudiantes');
        }

        throw ErrorHttp::prohibido('No tienes permiso para asignar roles');
    }

    private function verificarAlcance(UsuarioAutenticado $quien, Usuario $usuario): void
    {
        if ($quien->es(Rol::SUPERADMIN)) {
            return;
        }
        if ($usuario->institucion_id !== $quien->institucionId) {
            throw ErrorHttp::prohibido('No tienes acceso a este usuario');
        }
    }
}
