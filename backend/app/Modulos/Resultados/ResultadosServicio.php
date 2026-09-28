<?php

namespace App\Modulos\Resultados;

use App\Excepciones\ErrorHttp;
use App\Modelos\Inscripcion;
use App\Modelos\ModuloCurso;
use App\Modelos\Resultado;
use App\Soporte\Rol;
use App\Soporte\UsuarioAutenticado;

class ResultadosServicio
{
    public function listar(UsuarioAutenticado $quien)
    {
        $consulta = Resultado::with(['estudiante', 'modulo.curso'])->orderByDesc('creado_en');

        if ($quien->es(Rol::ESTUDIANTE)) {
            $consulta->where('estudiante_id', $quien->id);
        } elseif ($quien->es(Rol::DOCENTE)) {
            $consulta->whereHas('modulo.curso', fn ($curso) => $curso->where('docente_id', $quien->id));
        } elseif ($quien->es(Rol::ADMIN_INSTITUCION)) {
            $consulta->whereHas('modulo.curso', fn ($curso) => $curso->where('institucion_id', $quien->institucionParaFiltrar()));
        }

        return $consulta->get();
    }

    /**
     * Registra un intento. Lo usan el endpoint de resultados, el fin de una
     * partida y el paquete SCORM.
     *
     * La nota va de 0 a 10 con un decimal (el puntaje se acota a 100) y solo
     * si el modulo califica.
     */
    public function crear(UsuarioAutenticado $quien, string $moduloId, int $puntaje): Resultado
    {
        if (! $quien->es(Rol::ESTUDIANTE)) {
            throw ErrorHttp::prohibido('Solo un estudiante registra resultados de juego');
        }
        $modulo = ModuloCurso::find($moduloId);
        if (! $modulo) {
            throw ErrorHttp::noEncontrado('Modulo no encontrado');
        }
        $inscrito = Inscripcion::where('estudiante_id', $quien->id)->where('curso_id', $modulo->curso_id)->exists();
        if (! $inscrito) {
            throw ErrorHttp::prohibido('No estas inscrito en el curso de este modulo');
        }

        $intentosPrevios = Resultado::where('estudiante_id', $quien->id)->where('modulo_id', $modulo->id)->count();
        $nota = $modulo->califica ? number_format(min($puntaje, 100) / 10, 1, '.', '') : null;

        return Resultado::create([
            'estudiante_id' => $quien->id,
            'modulo_id' => $modulo->id,
            'intento' => $intentosPrevios + 1,
            'puntaje' => $puntaje,
            'nota' => $nota,
        ]);
    }
}
