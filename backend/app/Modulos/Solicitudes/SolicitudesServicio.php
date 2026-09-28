<?php

namespace App\Modulos\Solicitudes;

use App\Excepciones\ErrorHttp;
use App\Modelos\Curso;
use App\Modelos\Inscripcion;
use App\Modelos\Ruta;
use App\Modelos\Solicitud;
use App\Modelos\Usuario;
use App\Soporte\Rol;
use App\Soporte\UsuarioAutenticado;
use Illuminate\Support\Facades\DB;

class SolicitudesServicio
{
    public function listar(UsuarioAutenticado $quien)
    {
        $consulta = Solicitud::with(['estudiante', 'curso', 'ruta'])->orderByDesc('creado_en');

        if ($quien->es(Rol::ESTUDIANTE)) {
            $consulta->where('estudiante_id', $quien->id);
        } elseif ($quien->es(Rol::ADMIN_INSTITUCION)) {
            $consulta->whereIn(
                'estudiante_id',
                Usuario::select('id')->where('institucion_id', $quien->institucionParaFiltrar())
            );
        } elseif ($quien->es(Rol::DOCENTE)) {
            throw ErrorHttp::prohibido('Los docentes no gestionan solicitudes');
        }

        return $consulta->get();
    }

    public function crear(UsuarioAutenticado $quien, array $datos): Solicitud
    {
        if (! $quien->es(Rol::ESTUDIANTE)) {
            throw ErrorHttp::prohibido('Solo un estudiante puede enviar solicitudes');
        }
        $cursoId = $datos['cursoId'] ?? null;
        $rutaId = $datos['rutaId'] ?? null;

        if ($this->institucionDelObjetivo($cursoId, $rutaId) !== $quien->institucionId) {
            throw ErrorHttp::prohibido('El curso o ruta no pertenece a tu institucion');
        }

        $yaInscrito = $this->inscripcionesDe($quien->id, $cursoId, $rutaId)->exists();
        if ($datos['tipo'] === Solicitud::INGRESO && $yaInscrito) {
            throw ErrorHttp::solicitudInvalida('Ya estas inscrito en ese curso o ruta');
        }
        if ($datos['tipo'] === Solicitud::SALIDA && ! $yaInscrito) {
            throw ErrorHttp::solicitudInvalida('No estas inscrito en ese curso o ruta');
        }

        return Solicitud::create([
            'estudiante_id' => $quien->id,
            'tipo' => $datos['tipo'],
            'curso_id' => $cursoId,
            'ruta_id' => $rutaId,
        ])->fresh();
    }

    /** Aprobar aplica el cambio: una solicitud de ingreso inscribe, una de salida da de baja. */
    public function resolver(UsuarioAutenticado $quien, string $id, string $estado): Solicitud
    {
        if (! $quien->es(Rol::SUPERADMIN) && ! $quien->es(Rol::ADMIN_INSTITUCION)) {
            throw ErrorHttp::prohibido('No tienes permiso para resolver solicitudes');
        }
        $solicitud = Solicitud::with(['estudiante', 'curso', 'ruta'])->find($id);
        if (! $solicitud) {
            throw ErrorHttp::noEncontrado('Solicitud no encontrada');
        }
        if ($quien->es(Rol::ADMIN_INSTITUCION) && $solicitud->estudiante->institucion_id !== $quien->institucionId) {
            throw ErrorHttp::prohibido('No tienes acceso a esta solicitud');
        }
        if ($solicitud->estado !== Solicitud::PENDIENTE) {
            throw ErrorHttp::solicitudInvalida('La solicitud ya fue resuelta');
        }

        DB::transaction(function () use ($solicitud, $estado) {
            $solicitud->estado = $estado === 'aprobada' ? Solicitud::APROBADA : Solicitud::RECHAZADA;
            $solicitud->save();

            if ($estado === 'aprobada') {
                $this->aplicar($solicitud);
            }
        });

        return $solicitud;
    }

    /* ---------------------------------------------------------------- */

    private function aplicar(Solicitud $solicitud): void
    {
        if ($solicitud->tipo === Solicitud::INGRESO) {
            Inscripcion::create([
                'estudiante_id' => $solicitud->estudiante_id,
                'curso_id' => $solicitud->curso_id,
                'ruta_id' => $solicitud->ruta_id,
            ]);

            return;
        }

        $this->inscripcionesDe($solicitud->estudiante_id, $solicitud->curso_id, $solicitud->ruta_id)->delete();
    }

    /** Inscripciones del estudiante en ese curso y/o ruta (lo que no viene no filtra). */
    private function inscripcionesDe(string $estudianteId, ?string $cursoId, ?string $rutaId)
    {
        $consulta = Inscripcion::where('estudiante_id', $estudianteId);
        if ($cursoId) {
            $consulta->where('curso_id', $cursoId);
        }
        if ($rutaId) {
            $consulta->where('ruta_id', $rutaId);
        }

        return $consulta;
    }

    private function institucionDelObjetivo(?string $cursoId, ?string $rutaId): string
    {
        if ($cursoId) {
            $curso = Curso::find($cursoId);
            if (! $curso) {
                throw ErrorHttp::noEncontrado('Curso no encontrado');
            }

            return $curso->institucion_id;
        }
        if ($rutaId) {
            $ruta = Ruta::find($rutaId);
            if (! $ruta) {
                throw ErrorHttp::noEncontrado('Ruta no encontrada');
            }

            return $ruta->institucion_id;
        }

        throw ErrorHttp::solicitudInvalida('Debes indicar un curso o una ruta');
    }
}
