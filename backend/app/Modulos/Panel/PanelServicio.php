<?php

namespace App\Modulos\Panel;

use App\Modelos\Curso;
use App\Modelos\Inscripcion;
use App\Modelos\Institucion;
use App\Modelos\ModuloCurso;
use App\Modelos\Resultado;
use App\Modelos\Ruta;
use App\Modelos\Solicitud;
use App\Modelos\Usuario;
use App\Soporte\Rol;
use App\Soporte\UsuarioAutenticado;
use Illuminate\Support\Carbon;

class PanelServicio
{
    /** Las cifras de la portada; cada rol ve las suyas. */
    public function resumen(UsuarioAutenticado $quien): array
    {
        return match ($quien->rol) {
            Rol::SUPERADMIN => $this->resumenSuperadmin(),
            Rol::ADMIN_INSTITUCION => $this->resumenAdminInstitucion($quien->institucionParaFiltrar()),
            Rol::DOCENTE => $this->resumenDocente($quien->id, $quien->institucionParaFiltrar()),
            default => $this->resumenEstudiante($quien->id),
        };
    }

    /**
     * Actividad reciente del sistema. Se arma combinando las tablas existentes
     * (no hay una bitacora de auditoria dedicada, para mantener el alcance
     * simple); solo la usa el superadministrador.
     */
    public function actividadReciente(int $limite = 20): array
    {
        $ultimos = fn ($consulta) => $consulta->orderByDesc('creado_en')->limit(10)->get();

        $cursos = $ultimos(Curso::with('institucion'));
        $solicitudes = $ultimos(Solicitud::with(['estudiante.institucion', 'curso', 'ruta']));
        $resultados = $ultimos(Resultado::with(['estudiante.institucion', 'modulo']));
        $usuarios = $ultimos(Usuario::with('institucion'));

        $eventos = [
            ...$cursos->map(fn ($curso) => $this->evento(
                "Se creo el curso {$curso->nombre}",
                $curso->institucion?->nombre ?? '',
                $curso->creado_en,
            )),
            ...$solicitudes->map(fn ($solicitud) => $this->evento(
                $solicitud->estudiante->nombre.' '
                    .($solicitud->tipo === Solicitud::INGRESO ? 'solicito inscripcion a' : 'solicito salir de').' '
                    .($solicitud->curso?->nombre ?? $solicitud->ruta?->nombre ?? ''),
                $solicitud->estudiante->institucion?->nombre ?? '',
                $solicitud->creado_en,
            )),
            ...$resultados->map(fn ($resultado) => $this->evento(
                "{$resultado->estudiante->nombre} completo {$resultado->modulo->titulo} con {$resultado->puntaje} puntos",
                $resultado->estudiante->institucion?->nombre ?? '',
                $resultado->creado_en,
            )),
            ...$usuarios->map(fn ($usuario) => $this->evento(
                "Se dio de alta a {$usuario->nombre} ({$usuario->rol})",
                $usuario->institucion?->nombre ?? 'Global',
                $usuario->creado_en,
            )),
        ];

        // Por milisegundo, como lo ordenaba JavaScript; usort es estable, asi
        // que los empates quedan en el orden en que se armaron.
        usort($eventos, fn ($a, $b) => $b['ms'] <=> $a['ms']);

        return array_map(
            fn ($evento) => ['texto' => $evento['texto'], 'institucion' => $evento['institucion'], 'cuando' => $evento['cuando']],
            array_slice($eventos, 0, $limite)
        );
    }

    /* ---------------------------------------------------------------- */

    private function evento(string $texto, string $institucion, Carbon $cuando): array
    {
        return [
            'texto' => $texto,
            'institucion' => $institucion,
            'cuando' => $cuando->copy()->utc()->format('Y-m-d\TH:i:s.v\Z'),
            'ms' => (int) floor($cuando->getPreciseTimestamp(3)),
        ];
    }

    private function resumenSuperadmin(): array
    {
        return [
            'totalInstituciones' => Institucion::count(),
            'totalUsuarios' => Usuario::count(),
            'totalDocentes' => Usuario::where('rol', Rol::DOCENTE)->count(),
            'totalEstudiantes' => Usuario::where('rol', Rol::ESTUDIANTE)->count(),
            'totalCursos' => Curso::count(),
            'totalRutas' => Ruta::count(),
        ];
    }

    private function resumenAdminInstitucion(string $institucionId): array
    {
        return [
            'totalDocentes' => Usuario::where('institucion_id', $institucionId)->where('rol', Rol::DOCENTE)->count(),
            'totalEstudiantes' => Usuario::where('institucion_id', $institucionId)->where('rol', Rol::ESTUDIANTE)->count(),
            'totalCursos' => Curso::where('institucion_id', $institucionId)->count(),
            'totalRutas' => Ruta::where('institucion_id', $institucionId)->count(),
            'solicitudesPendientes' => Solicitud::where('estado', Solicitud::PENDIENTE)
                ->whereIn('estudiante_id', Usuario::select('id')->where('institucion_id', $institucionId))
                ->count(),
        ];
    }

    private function resumenDocente(string $docenteId, string $institucionId): array
    {
        $cursoIds = Curso::where('docente_id', $docenteId)->pluck('id');

        return [
            'misCursos' => $cursoIds->count(),
            'misRutas' => Ruta::where('institucion_id', $institucionId)->count(),
            'totalEstudiantes' => $cursoIds->isEmpty() ? 0 : Inscripcion::whereIn('curso_id', $cursoIds)->count(),
            'juegosConfigurados' => $cursoIds->isEmpty() ? 0 : ModuloCurso::whereIn('curso_id', $cursoIds)->has('configuracionJuego')->count(),
        ];
    }

    private function resumenEstudiante(string $estudianteId): array
    {
        return [
            'misCursos' => Inscripcion::where('estudiante_id', $estudianteId)->whereNotNull('curso_id')->count(),
            'misRutas' => Inscripcion::where('estudiante_id', $estudianteId)->whereNotNull('ruta_id')->count(),
        ];
    }
}
