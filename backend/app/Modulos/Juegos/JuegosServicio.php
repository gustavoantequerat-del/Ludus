<?php

namespace App\Modulos\Juegos;

use App\Excepciones\ErrorHttp;
use App\Modelos\ConfiguracionJuego;
use App\Modelos\Juego;
use App\Modelos\ModuloCurso;
use App\Modulos\Archivos\ArchivosServicio;
use App\Modulos\Juegos\MesaCumplimiento\MesaCumplimientoServicio;
use App\Modulos\Resultados\ResultadosServicio;
use App\Soporte\Rol;
use App\Soporte\UsuarioAutenticado;

class JuegosServicio
{
    public function __construct(
        private readonly MesaCumplimientoServicio $mesaCumplimiento,
        private readonly ResultadosServicio $resultados,
    ) {}

    public function listarCatalogo()
    {
        return Juego::orderBy('nombre')->get();
    }

    /* ---------------------------------------------------------------- *
     * Partidas de juegos con mecanica real
     * ---------------------------------------------------------------- */

    /** Expedientes de la partida, sin las respuestas correctas. */
    public function armarPartida(UsuarioAutenticado $quien, string $moduloId): array
    {
        $configuracion = $this->configuracionJugable($quien, $moduloId);

        return [
            'juego' => ['clave' => $configuracion->juego->clave, 'nombre' => $configuracion->juego->nombre],
            'titulo' => $configuracion->titulo,
            'instrucciones' => $configuracion->instrucciones,
            'tiempoLimiteSegundos' => $configuracion->tiempo_limite_segundos,
            // El fondo es una convencion de archivo, no un dato configurable:
            // el cliente lo pide y si no existe dibuja su degradado de respaldo.
            'escena' => ['fondo' => ArchivosServicio::FONDO_MESA],
            'casos' => $this->mesaCumplimiento->armarPartida($configuracion->pares_contenido, $quien->institucionId),
        ];
    }

    /** Feedback inmediato tras decidir un caso. */
    public function verificarCaso(string $casoId, string $decision): array
    {
        return $this->mesaCumplimiento->verificar($casoId, $decision);
    }

    /** Califica en el servidor y registra el intento del estudiante. */
    public function terminarPartida(UsuarioAutenticado $quien, string $moduloId, array $respuestas): array
    {
        $configuracion = $this->configuracionJugable($quien, $moduloId);
        $calificacion = $this->mesaCumplimiento->calificar($respuestas);
        $resultado = $this->resultados->crear($quien, $moduloId, $calificacion['puntaje']);

        return [
            'calificacion' => $calificacion,
            'intento' => $resultado->intento,
            'puntaje' => $resultado->puntaje,
            'nota' => $resultado->nota,
            'puntajeMaximo' => $configuracion->puntaje_maximo,
        ];
    }

    /* ---------------------------------------------------------------- *
     * Configuracion del juego de un modulo
     * ---------------------------------------------------------------- */

    public function obtenerConfiguracion(UsuarioAutenticado $quien, string $moduloId): ?ConfiguracionJuego
    {
        $this->moduloConAcceso($quien, $moduloId, false);

        return $this->configuracionDe($moduloId);
    }

    public function configurar(UsuarioAutenticado $quien, string $moduloId, array $datos): ConfiguracionJuego
    {
        $modulo = $this->moduloConAcceso($quien, $moduloId, true);
        $juego = Juego::find($datos['juegoId']);
        if (! $juego) {
            throw ErrorHttp::noEncontrado('Plantilla de juego no encontrada');
        }

        $configuracion = ConfiguracionJuego::firstOrNew(['modulo_id' => $moduloId]);
        $configuracion->fill([
            'juego_id' => $juego->id,
            'titulo' => $datos['titulo'],
            'instrucciones' => $datos['instrucciones'] ?? '',
            'velocidad' => $datos['velocidad'],
            'tiempo_limite_segundos' => $datos['tiempoLimiteSegundos'],
            'pares_contenido' => $datos['paresContenido'],
            'intentos_permitidos' => $datos['intentosPermitidos'],
            'puntaje_maximo' => $datos['puntajeMaximo'],
        ])->save();

        if (isset($datos['califica']) && $modulo->califica !== (bool) $datos['califica']) {
            $modulo->califica = (bool) $datos['califica'];
            $modulo->save();
        }

        return $this->configuracionDe($moduloId);
    }

    /* ---------------------------------------------------------------- */

    private function configuracionDe(string $moduloId): ?ConfiguracionJuego
    {
        return ConfiguracionJuego::with('juego')->where('modulo_id', $moduloId)->first();
    }

    private function configuracionJugable(UsuarioAutenticado $quien, string $moduloId): ConfiguracionJuego
    {
        $this->moduloConAcceso($quien, $moduloId, false);
        $configuracion = $this->configuracionDe($moduloId);
        if (! $configuracion) {
            throw ErrorHttp::solicitudInvalida('El modulo no tiene un juego configurado');
        }
        if ($configuracion->juego->clave !== Juego::CLAVE_MESA_CUMPLIMIENTO) {
            throw ErrorHttp::solicitudInvalida('Este juego todavia no tiene mecanica jugable');
        }

        return $configuracion;
    }

    private function moduloConAcceso(UsuarioAutenticado $quien, string $moduloId, bool $requiereEscritura): ModuloCurso
    {
        $modulo = ModuloCurso::with('curso')->find($moduloId);
        if (! $modulo) {
            throw ErrorHttp::noEncontrado('Modulo no encontrado');
        }

        if ($quien->es(Rol::SUPERADMIN)) {
            return $modulo;
        }
        if ($quien->es(Rol::ADMIN_INSTITUCION)) {
            if ($modulo->curso->institucion_id !== $quien->institucionId) {
                throw ErrorHttp::prohibido('No tienes acceso a este modulo');
            }

            return $modulo;
        }
        if ($quien->es(Rol::DOCENTE)) {
            if ($requiereEscritura && $modulo->curso->docente_id !== $quien->id) {
                throw ErrorHttp::prohibido('Solo el docente del curso puede configurar el juego');
            }
            if ($modulo->curso->institucion_id !== $quien->institucionId) {
                throw ErrorHttp::prohibido('No tienes acceso a este modulo');
            }

            return $modulo;
        }
        if ($requiereEscritura) {
            throw ErrorHttp::prohibido('Los estudiantes no pueden configurar juegos');
        }

        return $modulo;
    }
}
