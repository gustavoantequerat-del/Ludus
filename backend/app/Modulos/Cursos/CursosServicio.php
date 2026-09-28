<?php

namespace App\Modulos\Cursos;

use App\Excepciones\ErrorHttp;
use App\Modelos\Curso;
use App\Modelos\Inscripcion;
use App\Modelos\ModuloCurso;
use App\Soporte\Rol;
use App\Soporte\UsuarioAutenticado;
use Illuminate\Support\Facades\DB;

class CursosServicio
{
    /** Lo que ve cada rol: el docente sus cursos, el admin su institucion, el estudiante donde esta inscrito. */
    public function listar(UsuarioAutenticado $quien): array
    {
        $consulta = $this->consultaConModulos()->orderBy('nombre');

        if ($quien->es(Rol::DOCENTE)) {
            $consulta->where('docente_id', $quien->id);
        } elseif ($quien->es(Rol::ADMIN_INSTITUCION)) {
            $consulta->where('institucion_id', $quien->institucionParaFiltrar());
        } elseif ($quien->es(Rol::ESTUDIANTE)) {
            $cursoIds = $this->idsCursosDeEstudiante($quien->id);
            if (empty($cursoIds)) {
                return [];
            }
            $consulta->whereIn('id', $cursoIds);
        }

        return $this->conTotales($consulta->get());
    }

    /** Cursos de la institucion del estudiante en los que todavia no esta. */
    public function explorar(UsuarioAutenticado $quien): array
    {
        $cursoIds = $this->idsCursosDeEstudiante($quien->id);
        $consulta = $this->consultaConModulos()
            ->where('institucion_id', $quien->institucionParaFiltrar())
            ->orderBy('nombre');
        if (! empty($cursoIds)) {
            $consulta->whereNotIn('id', $cursoIds);
        }

        return $this->conTotales($consulta->get());
    }

    public function obtener(UsuarioAutenticado $quien, string $id): array
    {
        $curso = Curso::with([
            'docente',
            'modulos' => fn ($consulta) => $consulta->orderBy('orden'),
            'modulos.configuracionJuego.juego',
        ])->find($id);
        if (! $curso) {
            throw ErrorHttp::noEncontrado('Curso no encontrado');
        }
        $this->verificarAcceso($quien, $curso);

        return $this->conTotales(collect([$curso]))[0];
    }

    public function crear(UsuarioAutenticado $quien, array $datos): Curso
    {
        if ($quien->es(Rol::ESTUDIANTE)) {
            throw ErrorHttp::prohibido('Los estudiantes no pueden crear cursos');
        }
        $institucionId = $quien->es(Rol::SUPERADMIN) ? ($datos['institucionId'] ?? null) : $quien->institucionId;
        if (! $institucionId) {
            throw ErrorHttp::solicitudInvalida('Debes indicar la institucion del curso');
        }
        $docenteId = $quien->es(Rol::DOCENTE) ? $quien->id : ($datos['docenteId'] ?? null);

        return Curso::create([
            'nombre' => $datos['nombre'],
            'descripcion' => $datos['descripcion'] ?? '',
            'institucion_id' => $institucionId,
            'docente_id' => $docenteId,
        ])->fresh();
    }

    public function actualizar(UsuarioAutenticado $quien, string $id, array $datos): Curso
    {
        $curso = $this->cursoConAcceso($quien, $id);
        if (array_key_exists('nombre', $datos)) {
            $curso->nombre = $datos['nombre'];
        }
        if (array_key_exists('descripcion', $datos)) {
            $curso->descripcion = $datos['descripcion'];
        }
        // El docente no se reasigna a si mismo ni a otro: eso lo decide el admin.
        if (array_key_exists('docenteId', $datos) && ! $quien->es(Rol::DOCENTE)) {
            $curso->docente_id = $datos['docenteId'];
        }
        $curso->save();

        return $curso;
    }

    public function eliminar(UsuarioAutenticado $quien, string $id): void
    {
        $this->cursoConAcceso($quien, $id)->delete();
    }

    public function crearModulo(UsuarioAutenticado $quien, string $cursoId, array $datos): ModuloCurso
    {
        $curso = $this->cursoConAcceso($quien, $cursoId);
        $total = ModuloCurso::where('curso_id', $curso->id)->count();

        return ModuloCurso::create([
            'curso_id' => $curso->id,
            'titulo' => $datos['titulo'],
            'descripcion' => $datos['descripcion'] ?? '',
            'califica' => $datos['califica'] ?? true,
            'orden' => $total + 1,
        ])->fresh();
    }

    public function actualizarModulo(UsuarioAutenticado $quien, string $cursoId, string $moduloId, array $datos): ModuloCurso
    {
        $this->cursoConAcceso($quien, $cursoId);
        $modulo = $this->moduloDelCurso($cursoId, $moduloId);
        foreach (['titulo', 'descripcion', 'califica'] as $campo) {
            if (array_key_exists($campo, $datos)) {
                $modulo->$campo = $datos[$campo];
            }
        }
        $modulo->save();

        return $modulo;
    }

    public function eliminarModulo(UsuarioAutenticado $quien, string $cursoId, string $moduloId): void
    {
        $this->cursoConAcceso($quien, $cursoId);
        $this->moduloDelCurso($cursoId, $moduloId)->delete();
    }

    /** Intercambia el orden con el modulo vecino. En los extremos no hace nada. */
    public function moverModulo(UsuarioAutenticado $quien, string $cursoId, string $moduloId, string $direccion): void
    {
        $this->cursoConAcceso($quien, $cursoId);
        $modulos = ModuloCurso::where('curso_id', $cursoId)->orderBy('orden')->get()->values();
        $indice = $modulos->search(fn (ModuloCurso $modulo) => $modulo->id === $moduloId);
        if ($indice === false) {
            throw ErrorHttp::noEncontrado('Modulo no encontrado');
        }
        $destino = $direccion === 'arriba' ? $indice - 1 : $indice + 1;
        if ($destino < 0 || $destino >= $modulos->count()) {
            return;
        }

        $actual = $modulos[$indice];
        $vecino = $modulos[$destino];
        DB::transaction(function () use ($actual, $vecino) {
            [$actual->orden, $vecino->orden] = [$vecino->orden, $actual->orden];
            $actual->save();
            $vecino->save();
        });
    }

    /* ---------------------------------------------------------------- */

    private function consultaConModulos()
    {
        return Curso::with(['docente', 'modulos' => fn ($consulta) => $consulta->orderBy('orden')]);
    }

    private function moduloDelCurso(string $cursoId, string $moduloId): ModuloCurso
    {
        $modulo = ModuloCurso::where('id', $moduloId)->where('curso_id', $cursoId)->first();
        if (! $modulo) {
            throw ErrorHttp::noEncontrado('Modulo no encontrado');
        }

        return $modulo;
    }

    /** Carga el curso y valida que quien escribe tenga permiso sobre el. */
    private function cursoConAcceso(UsuarioAutenticado $quien, string $id): Curso
    {
        $curso = Curso::find($id);
        if (! $curso) {
            throw ErrorHttp::noEncontrado('Curso no encontrado');
        }
        $this->verificarAcceso($quien, $curso, true);

        return $curso;
    }

    private function verificarAcceso(UsuarioAutenticado $quien, Curso $curso, bool $requiereEscritura = false): void
    {
        if ($quien->es(Rol::SUPERADMIN)) {
            return;
        }
        if ($quien->es(Rol::ADMIN_INSTITUCION)) {
            if ($curso->institucion_id !== $quien->institucionId) {
                throw ErrorHttp::prohibido('No tienes acceso a este curso');
            }

            return;
        }
        if ($quien->es(Rol::DOCENTE)) {
            if ($requiereEscritura && $curso->docente_id !== $quien->id) {
                throw ErrorHttp::prohibido('Solo el docente asignado puede modificar este curso');
            }
            if ($curso->institucion_id !== $quien->institucionId) {
                throw ErrorHttp::prohibido('No tienes acceso a este curso');
            }

            return;
        }

        // Estudiante: solo lectura de cursos donde esta inscrito.
        if ($requiereEscritura) {
            throw ErrorHttp::prohibido('Los estudiantes no pueden modificar cursos');
        }
        $inscrito = Inscripcion::where('estudiante_id', $quien->id)->where('curso_id', $curso->id)->exists();
        if (! $inscrito) {
            throw ErrorHttp::prohibido('No estas inscrito en este curso');
        }
    }

    private function idsCursosDeEstudiante(string $estudianteId): array
    {
        return Inscripcion::where('estudiante_id', $estudianteId)
            ->whereNotNull('curso_id')
            ->pluck('curso_id')
            ->all();
    }

    /** Agrega totalEstudiantes y totalModulos a cada curso. */
    private function conTotales($cursos): array
    {
        if ($cursos->isEmpty()) {
            return [];
        }
        $conteos = Inscripcion::whereIn('curso_id', $cursos->pluck('id'))
            ->groupBy('curso_id')
            ->selectRaw('curso_id, COUNT(*) AS total')
            ->pluck('total', 'curso_id');

        return $cursos->map(fn (Curso $curso) => [
            ...$curso->toArray(),
            'totalEstudiantes' => (int) ($conteos[$curso->id] ?? 0),
            'totalModulos' => $curso->modulos->count(),
        ])->all();
    }
}
