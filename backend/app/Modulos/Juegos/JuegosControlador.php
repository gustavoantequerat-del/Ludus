<?php

namespace App\Modulos\Juegos;

use App\Http\Controlador;
use Illuminate\Http\Request;

class JuegosControlador extends Controlador
{
    /** Una respuesta de la partida. Tambien las usa el paquete SCORM. */
    public const REGLAS_VERIFICAR = [
        'casoId' => 'required|string',
        'decision' => 'required|in:aprobar,reforzar,rechazar',
    ];

    public const REGLAS_TERMINAR = [
        'respuestas' => 'required|array|list|min:1|max:50',
        'respuestas.*' => 'array',
        'respuestas.*.casoId' => 'required|string',
        'respuestas.*.decision' => 'required|in:aprobar,reforzar,rechazar',
    ];

    public function __construct(private readonly JuegosServicio $servicio) {}

    public function listarCatalogo()
    {
        return $this->servicio->listarCatalogo();
    }

    public function armarPartida(Request $peticion, string $moduloId)
    {
        return $this->servicio->armarPartida($this->quien($peticion), $moduloId);
    }

    public function verificarCaso(Request $peticion)
    {
        $datos = $this->validar($peticion, self::REGLAS_VERIFICAR);

        return $this->servicio->verificarCaso($datos['casoId'], $datos['decision']);
    }

    public function terminarPartida(Request $peticion, string $moduloId)
    {
        $datos = $this->validar($peticion, self::REGLAS_TERMINAR);

        return $this->servicio->terminarPartida($this->quien($peticion), $moduloId, self::respuestas($datos));
    }

    public function obtenerConfiguracion(Request $peticion, string $moduloId)
    {
        $configuracion = $this->servicio->obtenerConfiguracion($this->quien($peticion), $moduloId);

        // Sin configuracion: 200 sin cuerpo, como respondia Nest a un null.
        return $configuracion ?? $this->sinContenido();
    }

    public function configurar(Request $peticion, string $moduloId)
    {
        $datos = $this->validar($peticion, [
            'juegoId' => 'required|uuid',
            'titulo' => 'present|string|max:140',
            'instrucciones' => 'sometimes|nullable|string',
            'velocidad' => 'required|in:baja,media,alta',
            'tiempoLimiteSegundos' => 'required|integer|min:30|max:600',
            'paresContenido' => 'required|integer|min:4|max:24',
            'intentosPermitidos' => 'required|integer|min:1|max:5',
            'puntajeMaximo' => 'required|integer|min:10|max:200',
            'califica' => 'sometimes|nullable|boolean',
        ]);

        return $this->servicio->configurar($this->quien($peticion), $moduloId, $datos);
    }

    /** Solo casoId y decision de cada respuesta; lo demas se descarta. */
    public static function respuestas(array $datos): array
    {
        return array_map(
            fn ($respuesta) => ['casoId' => (string) $respuesta['casoId'], 'decision' => $respuesta['decision']],
            $datos['respuestas']
        );
    }
}
