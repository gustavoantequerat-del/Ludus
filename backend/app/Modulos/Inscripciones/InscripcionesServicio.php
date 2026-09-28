<?php

namespace App\Modulos\Inscripciones;

use App\Excepciones\ErrorHttp;
use App\Modelos\Curso;
use App\Modelos\Inscripcion;
use App\Modelos\Ruta;
use App\Modelos\Usuario;
use App\Soporte\Rol;
use App\Soporte\UsuarioAutenticado;
use Illuminate\Support\Facades\DB;

class InscripcionesServicio
{
    public function listarDeCurso(UsuarioAutenticado $quien, string $cursoId)
    {
        $curso = $this->cursoConAcceso($quien, $cursoId);

        return $this->listarDonde('curso_id', $curso->id);
    }

    public function listarDeRuta(UsuarioAutenticado $quien, string $rutaId)
    {
        $ruta = $this->rutaConAcceso($quien, $rutaId);

        return $this->listarDonde('ruta_id', $ruta->id);
    }

    /** Reemplaza la lista completa de estudiantes inscritos en un curso. */
    public function asignarACurso(UsuarioAutenticado $quien, string $cursoId, array $estudianteIds): array
    {
        $curso = $this->cursoConAcceso($quien, $cursoId);

        return $this->reemplazar('curso_id', $curso->id, $curso->institucion_id, $estudianteIds);
    }

    /** Reemplaza la lista completa de estudiantes inscritos en una ruta. */
    public function asignarARuta(UsuarioAutenticado $quien, string $rutaId, array $estudianteIds): array
    {
        $ruta = $this->rutaConAcceso($quien, $rutaId);

        return $this->reemplazar('ruta_id', $ruta->id, $ruta->institucion_id, $estudianteIds);
    }

    /* ---------------------------------------------------------------- */

    private function listarDonde(string $columna, string $id)
    {
        return Inscripcion::with('estudiante')->where($columna, $id)->orderBy('creado_en')->get();
    }

    private function reemplazar(string $columna, string $id, string $institucionId, array $estudianteIds): array
    {
        $this->verificarEstudiantesDeInstitucion($institucionId, $estudianteIds);

        return DB::transaction(function () use ($columna, $id, $estudianteIds) {
            Inscripcion::where($columna, $id)->delete();

            return array_map(
                fn (string $estudianteId) => Inscripcion::create([$columna => $id, 'estudiante_id' => $estudianteId])->fresh(),
                $estudianteIds
            );
        });
    }

    private function cursoConAcceso(UsuarioAutenticado $quien, string $cursoId): Curso
    {
        $curso = Curso::find($cursoId);
        if (! $curso) {
            throw ErrorHttp::noEncontrado('Curso no encontrado');
        }
        if ($quien->es(Rol::SUPERADMIN)) {
            return $curso;
        }
        if ($quien->es(Rol::ESTUDIANTE)) {
            throw ErrorHttp::prohibido('Los estudiantes no administran inscripciones');
        }
        if ($curso->institucion_id !== $quien->institucionId) {
            throw ErrorHttp::prohibido('No tienes acceso a este curso');
        }
        if ($quien->es(Rol::DOCENTE) && $curso->docente_id !== $quien->id) {
            throw ErrorHttp::prohibido('Solo el docente asignado administra este curso');
        }

        return $curso;
    }

    private function rutaConAcceso(UsuarioAutenticado $quien, string $rutaId): Ruta
    {
        $ruta = Ruta::find($rutaId);
        if (! $ruta) {
            throw ErrorHttp::noEncontrado('Ruta no encontrada');
        }
        if ($quien->es(Rol::SUPERADMIN)) {
            return $ruta;
        }
        if ($quien->es(Rol::ESTUDIANTE)) {
            throw ErrorHttp::prohibido('Los estudiantes no administran inscripciones');
        }
        if ($ruta->institucion_id !== $quien->institucionId) {
            throw ErrorHttp::prohibido('No tienes acceso a esta ruta');
        }

        return $ruta;
    }

    /** Todos deben existir, ser estudiantes y ser de la institucion del curso o ruta. */
    private function verificarEstudiantesDeInstitucion(string $institucionId, array $estudianteIds): void
    {
        if (empty($estudianteIds)) {
            return;
        }
        $encontrados = Usuario::whereIn('id', $estudianteIds)->get();
        $todosValidos = $encontrados->count() === count($estudianteIds)
            && $encontrados->every(fn (Usuario $usuario) => $usuario->institucion_id === $institucionId && $usuario->rol === Rol::ESTUDIANTE);
        if (! $todosValidos) {
            throw ErrorHttp::prohibido('Todos los estudiantes deben ser de la misma institucion');
        }
    }
}
