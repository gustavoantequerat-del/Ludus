<?php

namespace App\Modulos\Juegos\MesaCumplimiento;

use App\Excepciones\ErrorHttp;
use App\Modelos\CasoCumplimiento;
use App\Modelos\Personaje;
use App\Soporte\Rol;
use App\Soporte\UsuarioAutenticado;
use Illuminate\Support\Facades\DB;

/**
 * Casos que administra el docente.
 *
 * Los del catalogo base (institucion_id en null) se ven siempre, pero solo el
 * superadmin los edita: para el docente son plantillas que puede duplicar a
 * su institucion y recien ahi cambiar.
 */
class CasosServicio
{
    /** Campo del cuerpo => columna, para lo que el docente puede cambiar sin tocar el alcance. */
    private const CAMPOS_EDITABLES = [
        'tipo' => 'tipo',
        'jurisdiccion' => 'jurisdiccion',
        'solicitud' => 'solicitud',
        'registroLicencia' => 'registro_licencia',
        'travelRule' => 'travel_rule',
        'beneficiarioFinal' => 'beneficiario_final',
        'controlesAml' => 'controles_aml',
        'sanciones' => 'sanciones',
        'exposicionOnchain' => 'exposicion_onchain',
        'camposExtra' => 'campos_extra',
        'regla' => 'regla',
        'explicacion' => 'explicacion',
        'origen' => 'origen',
        'activo' => 'activo',
    ];

    public function listar(UsuarioAutenticado $quien)
    {
        $consulta = CasoCumplimiento::with('personaje')
            ->orderByRaw('institucion_id ASC NULLS LAST')
            ->orderBy('entidad');

        if (! $quien->es(Rol::SUPERADMIN)) {
            $consulta->where(fn ($donde) => $donde
                ->where('institucion_id', $quien->institucionParaFiltrar())
                ->orWhereNull('institucion_id'));
        }

        return $consulta->get();
    }

    public function crear(UsuarioAutenticado $quien, array $datos): CasoCumplimiento
    {
        return CasoCumplimiento::create([
            ...$this->camposEditables($datos),
            'entidad' => $datos['entidad'],
            'decision_correcta' => $datos['decisionCorrecta'],
            'personaje_id' => $this->personajeValido($quien, $datos['personajeId'] ?? null),
            'institucion_id' => $quien->es(Rol::SUPERADMIN) ? null : $quien->institucionId,
        ])->fresh();
    }

    public function actualizar(UsuarioAutenticado $quien, string $id, array $datos): CasoCumplimiento
    {
        $caso = $this->conAcceso($quien, $id);
        $caso->fill($this->camposEditables($datos));
        if (array_key_exists('entidad', $datos)) {
            $caso->entidad = $datos['entidad'];
        }
        if (array_key_exists('decisionCorrecta', $datos)) {
            $caso->decision_correcta = $datos['decisionCorrecta'];
        }
        if (array_key_exists('personajeId', $datos)) {
            $caso->personaje_id = $this->personajeValido($quien, $datos['personajeId']);
        }
        $caso->save();

        return $caso->load('personaje');
    }

    public function eliminar(UsuarioAutenticado $quien, string $id): void
    {
        $this->conAcceso($quien, $id)->delete();
    }

    /**
     * Copia casos del catalogo base a la institucion del docente para que
     * pueda editarlos. Sin `ids` copia todo el catalogo, que es el atajo para
     * arrancar; con `ids` trae solo esos, asi el docente suma casos base a los
     * que ya escribio sin arrastrar el resto. Los que ya copio antes (misma
     * entidad) no se repiten.
     *
     * A partir de la primera copia, la mesa juega con los casos de la
     * institucion y deja de usar el catalogo base.
     */
    public function duplicarBase(UsuarioAutenticado $quien, ?array $ids): array
    {
        if (! $quien->institucionId) {
            throw ErrorHttp::solicitudInvalida('Tu usuario no pertenece a una institucion');
        }

        $consulta = CasoCumplimiento::whereNull('institucion_id');
        if (! empty($ids)) {
            $consulta->whereIn('id', $ids);
        }
        $base = $consulta->get();
        if (! empty($ids) && $base->isEmpty()) {
            throw ErrorHttp::solicitudInvalida('Esos casos no estan en el catalogo base');
        }

        $yaCopiadas = CasoCumplimiento::where('institucion_id', $quien->institucionId)->pluck('entidad')->flip();

        return DB::transaction(fn () => $base
            ->reject(fn (CasoCumplimiento $caso) => $yaCopiadas->has($caso->entidad))
            ->map(function (CasoCumplimiento $caso) use ($quien) {
                $copia = $caso->replicate(['creado_en', 'actualizado_en']);
                $copia->institucion_id = $quien->institucionId;
                $copia->save();

                return $copia;
            })
            ->values()
            ->all());
    }

    /* ---------------------------------------------------------------- */

    /** Un campo que no vino en el cuerpo no se toca; uno que vino vacio si. */
    private function camposEditables(array $datos): array
    {
        $columnas = [];
        foreach (self::CAMPOS_EDITABLES as $campo => $columna) {
            if (array_key_exists($campo, $datos)) {
                $columnas[$columna] = $datos[$campo];
            }
        }
        if (isset($columnas['campos_extra'])) {
            $columnas['campos_extra'] = array_map(
                fn ($extra) => ['etiqueta' => $extra['etiqueta'], 'valor' => $extra['valor']],
                $columnas['campos_extra']
            );
        }
        if (isset($columnas['activo'])) {
            $columnas['activo'] = (bool) $columnas['activo'];
        }

        return $columnas;
    }

    private function personajeValido(UsuarioAutenticado $quien, ?string $personajeId): ?string
    {
        if (! $personajeId) {
            return null;
        }
        $personaje = Personaje::find($personajeId);
        if (! $personaje) {
            throw ErrorHttp::noEncontrado('El personaje no existe');
        }
        if (! $quien->es(Rol::SUPERADMIN) && $personaje->institucion_id !== null && $personaje->institucion_id !== $quien->institucionId) {
            throw ErrorHttp::prohibido('Ese personaje es de otra institucion');
        }

        return $personaje->id;
    }

    private function conAcceso(UsuarioAutenticado $quien, string $id): CasoCumplimiento
    {
        $caso = CasoCumplimiento::find($id);
        if (! $caso) {
            throw ErrorHttp::noEncontrado('El caso no existe');
        }
        if ($quien->es(Rol::SUPERADMIN)) {
            return $caso;
        }
        if ($caso->institucion_id === null) {
            throw ErrorHttp::prohibido('El catalogo base no se edita: duplicalo a tu institucion y cambia la copia');
        }
        if ($caso->institucion_id !== $quien->institucionId) {
            throw ErrorHttp::prohibido('No tienes acceso a este caso');
        }

        return $caso;
    }
}
