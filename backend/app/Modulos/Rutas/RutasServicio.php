<?php

namespace App\Modulos\Rutas;

use App\Excepciones\ErrorHttp;
use App\Modelos\Curso;
use App\Modelos\Inscripcion;
use App\Modelos\Ruta;
use App\Modelos\RutaCurso;
use App\Soporte\Rol;
use App\Soporte\UsuarioAutenticado;

class RutasServicio
{
    public function listar(UsuarioAutenticado $quien): array
    {
        $consulta = $this->consultaConCursos()->orderBy('nombre');

        if ($quien->es(Rol::ESTUDIANTE)) {
            $rutaIds = Inscripcion::where('estudiante_id', $quien->id)->whereNotNull('ruta_id')->pluck('ruta_id')->all();
            if (empty($rutaIds)) {
                return [];
            }
            $consulta->whereIn('id', $rutaIds);
        } elseif (! $quien->es(Rol::SUPERADMIN)) {
            $consulta->where('institucion_id', $quien->institucionParaFiltrar());
        }

        return $this->conTotales($consulta->get());
    }

    public function obtener(UsuarioAutenticado $quien, string $id): array
    {
        $ruta = $this->consultaConCursos()->find($id);
        if (! $ruta) {
            throw ErrorHttp::noEncontrado('Ruta no encontrada');
        }
        $this->verificarAcceso($quien, $ruta);

        return $this->conTotales(collect([$ruta]))[0];
    }

    public function crear(UsuarioAutenticado $quien, array $datos): Ruta
    {
        if ($quien->es(Rol::ESTUDIANTE)) {
            throw ErrorHttp::prohibido('Los estudiantes no pueden crear rutas');
        }
        $institucionId = $quien->es(Rol::SUPERADMIN) ? ($datos['institucionId'] ?? null) : $quien->institucionId;
        if (! $institucionId) {
            throw ErrorHttp::solicitudInvalida('Debes indicar la institucion de la ruta');
        }

        return Ruta::create([
            'nombre' => $datos['nombre'],
            'descripcion' => $datos['descripcion'] ?? '',
            'institucion_id' => $institucionId,
        ])->fresh();
    }

    public function actualizar(UsuarioAutenticado $quien, string $id, array $datos): Ruta
    {
        $ruta = $this->rutaConAcceso($quien, $id);
        foreach (['nombre', 'descripcion'] as $campo) {
            if (array_key_exists($campo, $datos)) {
                $ruta->$campo = $datos[$campo];
            }
        }
        $ruta->save();

        return $ruta;
    }

    public function eliminar(UsuarioAutenticado $quien, string $id): void
    {
        $this->rutaConAcceso($quien, $id)->delete();
    }

    public function agregarCurso(UsuarioAutenticado $quien, string $rutaId, string $cursoId): RutaCurso
    {
        $ruta = $this->rutaConAcceso($quien, $rutaId);
        $curso = Curso::find($cursoId);
        if (! $curso) {
            throw ErrorHttp::noEncontrado('Curso no encontrado');
        }
        if ($curso->institucion_id !== $ruta->institucion_id) {
            throw ErrorHttp::solicitudInvalida('El curso debe ser de la misma institucion que la ruta');
        }
        $total = RutaCurso::where('ruta_id', $rutaId)->count();

        return RutaCurso::create(['ruta_id' => $rutaId, 'curso_id' => $cursoId, 'orden' => $total + 1]);
    }

    public function quitarCurso(UsuarioAutenticado $quien, string $rutaId, string $cursoId): void
    {
        $this->rutaConAcceso($quien, $rutaId);
        $rutaCurso = RutaCurso::where('ruta_id', $rutaId)->where('curso_id', $cursoId)->first();
        if (! $rutaCurso) {
            throw ErrorHttp::noEncontrado('El curso no pertenece a esta ruta');
        }
        $rutaCurso->delete();
    }

    /* ---------------------------------------------------------------- */

    private function consultaConCursos()
    {
        return Ruta::with(['cursos' => fn ($consulta) => $consulta->orderBy('orden'), 'cursos.curso']);
    }

    private function rutaConAcceso(UsuarioAutenticado $quien, string $id): Ruta
    {
        $ruta = Ruta::find($id);
        if (! $ruta) {
            throw ErrorHttp::noEncontrado('Ruta no encontrada');
        }
        $this->verificarAcceso($quien, $ruta, true);

        return $ruta;
    }

    private function verificarAcceso(UsuarioAutenticado $quien, Ruta $ruta, bool $requiereEscritura = false): void
    {
        if ($quien->es(Rol::SUPERADMIN)) {
            return;
        }
        if ($quien->es(Rol::ADMIN_INSTITUCION) || $quien->es(Rol::DOCENTE)) {
            if ($ruta->institucion_id !== $quien->institucionId) {
                throw ErrorHttp::prohibido('No tienes acceso a esta ruta');
            }

            return;
        }
        if ($requiereEscritura) {
            throw ErrorHttp::prohibido('Los estudiantes no pueden modificar rutas');
        }
        $inscrito = Inscripcion::where('estudiante_id', $quien->id)->where('ruta_id', $ruta->id)->exists();
        if (! $inscrito) {
            throw ErrorHttp::prohibido('No estas inscrito en esta ruta');
        }
    }

    /** Agrega totalEstudiantes a cada ruta. */
    private function conTotales($rutas): array
    {
        if ($rutas->isEmpty()) {
            return [];
        }
        $conteos = Inscripcion::whereIn('ruta_id', $rutas->pluck('id'))
            ->groupBy('ruta_id')
            ->selectRaw('ruta_id, COUNT(*) AS total')
            ->pluck('total', 'ruta_id');

        return $rutas->map(fn (Ruta $ruta) => [
            ...$ruta->toArray(),
            'totalEstudiantes' => (int) ($conteos[$ruta->id] ?? 0),
        ])->all();
    }
}
