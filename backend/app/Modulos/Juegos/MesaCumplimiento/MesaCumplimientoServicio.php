<?php

namespace App\Modulos\Juegos\MesaCumplimiento;

use App\Excepciones\ErrorHttp;
use App\Modelos\CasoCumplimiento;
use Illuminate\Support\Str;

/**
 * La mecanica de la Mesa de Cumplimiento: armar la partida con los
 * expedientes (sin la respuesta), dar el veredicto de cada decision y
 * calificar la partida completa en el servidor.
 */
class MesaCumplimientoServicio
{
    public const DECISIONES = ['aprobar', 'reforzar', 'rechazar'];

    public const ETIQUETAS_DECISION = [
        'aprobar' => 'Aprobar',
        'reforzar' => 'Aprobar con EDD',
        'rechazar' => 'Rechazar',
    ];

    /**
     * Los seis campos fijos del expediente, en su orden, con el texto que ve
     * el jugador. El docente cambia los valores; las etiquetas son del
     * dominio y no se editan.
     */
    public const ETIQUETAS_EXPEDIENTE = [
        'registro_licencia' => 'Registro / licencia',
        'travel_rule' => 'Travel Rule',
        'beneficiario_final' => 'Beneficiario final',
        'controles_aml' => 'Controles AML',
        'sanciones' => 'Sanciones',
        'exposicion_onchain' => 'Exposicion on-chain',
    ];

    /**
     * Baraja el banco de la institucion y devuelve los expedientes sin la
     * respuesta correcta.
     *
     * Si la institucion todavia no escribio casos propios se juega con el
     * catalogo base de Ludus; en cuanto tiene uno, la mesa usa solo los suyos.
     */
    public function armarPartida(int $cantidad, ?string $institucionId): array
    {
        $casos = $this->bancoDe($institucionId);
        if ($casos->isEmpty()) {
            throw ErrorHttp::solicitudInvalida('No hay casos cargados para este juego');
        }

        $total = min(max($cantidad, 1), $casos->count());

        return $casos->shuffle()->take($total)->map(fn ($caso) => $this->aPublico($caso))->values()->all();
    }

    /** Feedback inmediato de un caso, para mostrarlo apenas el jugador decide. */
    public function verificar(string $casoId, string $decision): array
    {
        $this->decisionValida($decision);
        $caso = Str::isUuid($casoId) ? CasoCumplimiento::find($casoId) : null;
        if (! $caso) {
            throw ErrorHttp::solicitudInvalida('El caso no existe');
        }

        return $this->veredicto($caso, $decision);
    }

    /**
     * Calificacion autoritativa de la partida. Se recalcula en el servidor
     * para que la nota no dependa de lo que informe el cliente.
     *
     * @param  array<int, array{casoId: string, decision: string}>  $respuestas
     */
    public function calificar(array $respuestas): array
    {
        if (empty($respuestas)) {
            throw ErrorHttp::solicitudInvalida('La partida no tiene respuestas');
        }

        $ids = array_values(array_filter(array_column($respuestas, 'casoId'), fn ($id) => Str::isUuid($id)));
        $porId = CasoCumplimiento::whereIn('id', $ids)->get()->keyBy('id');

        $detalle = array_map(function ($respuesta) use ($porId) {
            $this->decisionValida($respuesta['decision']);
            $caso = $porId[$respuesta['casoId']] ?? null;
            if (! $caso) {
                throw ErrorHttp::solicitudInvalida('El caso no existe');
            }

            return $this->veredicto($caso, $respuesta['decision']);
        }, $respuestas);

        $aciertos = count(array_filter($detalle, fn ($v) => $v['correcta']));

        // Distinguir el tipo de error es parte de la ensenanza del curso:
        // aprobar de mas y rechazar por reflejo son fallas distintas.
        $erroresPorExceso = count(array_filter($detalle, fn ($v) => ! $v['correcta'] && $v['decisionTomada'] === 'rechazar'));
        $erroresPorOmision = count(array_filter($detalle, fn ($v) => ! $v['correcta'] && $v['decisionCorrecta'] === 'rechazar'));

        return [
            'puntaje' => (int) round($aciertos / count($detalle) * 100),
            'aciertos' => $aciertos,
            'total' => count($detalle),
            'erroresPorExceso' => $erroresPorExceso,
            'erroresPorOmision' => $erroresPorOmision,
            'detalle' => $detalle,
        ];
    }

    /* ---------------------------------------------------------------- */

    /** Casos propios de la institucion; si no tiene, el catalogo base. */
    private function bancoDe(?string $institucionId)
    {
        if ($institucionId) {
            $propios = CasoCumplimiento::with('personaje')
                ->where('institucion_id', $institucionId)
                ->where('activo', true)
                ->get();
            if ($propios->isNotEmpty()) {
                return $propios;
            }
        }

        return CasoCumplimiento::with('personaje')->whereNull('institucion_id')->where('activo', true)->get();
    }

    private function veredicto(CasoCumplimiento $caso, string $decision): array
    {
        return [
            'casoId' => $caso->id,
            'entidad' => $caso->entidad,
            'decisionTomada' => $decision,
            'decisionCorrecta' => $caso->decision_correcta,
            'correcta' => $decision === $caso->decision_correcta,
            'regla' => $caso->regla,
            'explicacion' => $caso->explicacion,
            'origen' => $caso->origen,
        ];
    }

    private function decisionValida(string $decision): void
    {
        if (! in_array($decision, self::DECISIONES, true)) {
            throw ErrorHttp::solicitudInvalida('Decision invalida');
        }
    }

    /** Lo que ve el jugador: el expediente sin la respuesta. */
    private function aPublico(CasoCumplimiento $caso): array
    {
        return [
            'id' => $caso->id,
            'entidad' => $caso->entidad,
            'tipo' => $caso->tipo,
            'jurisdiccion' => $caso->jurisdiccion,
            'solicitud' => $caso->solicitud,
            'campos' => $this->expediente($caso),
            'personaje' => $caso->personaje
                ? ['nombre' => $caso->personaje->nombre, 'cargo' => $caso->personaje->cargo, 'imagen' => $caso->personaje->imagen]
                : null,
        ];
    }

    /**
     * Los seis campos fijos en su orden, sin los vacios, mas los extra del
     * caso. Un campo vacio no se muestra: el expediente no debe sugerir que
     * falta algo cuando el docente simplemente no lo uso.
     */
    private function expediente(CasoCumplimiento $caso): array
    {
        $campos = [];
        foreach (self::ETIQUETAS_EXPEDIENTE as $columna => $etiqueta) {
            if ((string) $caso->$columna !== '') {
                $campos[] = ['etiqueta' => $etiqueta, 'valor' => $caso->$columna];
            }
        }

        return [...$campos, ...($caso->campos_extra ?? [])];
    }
}
