<?php

namespace App\Modulos\Scorm;

use App\Excepciones\ErrorHttp;
use App\Modelos\ConfiguracionJuego;
use App\Modelos\Inscripcion;
use App\Modelos\ModuloCurso;
use App\Modelos\PaqueteScorm;
use App\Modulos\Autenticacion\AutenticacionServicio;
use App\Modulos\Juegos\JuegosServicio;
use App\Modulos\Resultados\ResultadosServicio;
use App\Soporte\Rol;
use App\Soporte\UsuarioAutenticado;
use ZipArchive;

class ScormServicio
{
    private const ARCHIVOS_PLANTILLA = ['index.html', 'estilos.css', 'ludus-scorm.js'];

    public function __construct(
        private readonly AutenticacionServicio $autenticacion,
        private readonly ResultadosServicio $resultados,
        private readonly JuegosServicio $juegos,
    ) {}

    /* ---------------------------------------------------------------- *
     * Paquetes (docente / admin / superadmin)
     * ---------------------------------------------------------------- */

    /**
     * La direccion que se escribe dentro de cada paquete y si sirve para un
     * LMS de verdad.
     *
     * El paquete se ejecuta en el navegador del estudiante, dentro del sitio
     * del LMS: "localhost" ahi es la maquina del estudiante, no el servidor, y
     * un LMS por HTTPS no puede pedir nada por HTTP. Conviene decirlo antes de
     * exportar, no cuando el estudiante ve una pantalla en blanco.
     */
    public function diagnostico(): array
    {
        $urlApi = $this->urlApi();

        return ['urlApi' => $urlApi, 'advertencia' => $this->advertenciaDeUrl($urlApi)];
    }

    public function listar(UsuarioAutenticado $quien)
    {
        $consulta = PaqueteScorm::with(['modulo.curso', 'creadoPor'])->orderByDesc('creado_en');

        if ($quien->es(Rol::DOCENTE)) {
            $consulta->whereHas('modulo.curso', fn ($curso) => $curso->where('docente_id', $quien->id));
        } elseif ($quien->es(Rol::ADMIN_INSTITUCION)) {
            $consulta->whereHas('modulo.curso', fn ($curso) => $curso->where('institucion_id', $quien->institucionParaFiltrar()));
        }

        return $consulta->get();
    }

    public function crear(UsuarioAutenticado $quien, string $moduloId): PaqueteScorm
    {
        $modulo = $this->moduloConAcceso($quien, $moduloId);
        if (! $this->configuracionDe($moduloId)) {
            throw ErrorHttp::solicitudInvalida('El modulo necesita un juego configurado antes de exportarlo a SCORM');
        }

        return PaqueteScorm::create([
            'token' => bin2hex(random_bytes(16)),
            'modulo_id' => $modulo->id,
            'creado_por_id' => $quien->id,
        ])->fresh();
    }

    public function cambiarEstado(UsuarioAutenticado $quien, string $id, bool $activo): PaqueteScorm
    {
        $paquete = $this->paqueteConAcceso($quien, $id);
        $paquete->activo = $activo;
        $paquete->save();

        return $paquete;
    }

    public function eliminar(UsuarioAutenticado $quien, string $id): void
    {
        $this->paqueteConAcceso($quien, $id)->delete();
    }

    /**
     * Arma el ZIP del paquete listo para subir al LMS.
     *
     * @return array{nombreArchivo: string, contenido: string}
     */
    public function generarZip(UsuarioAutenticado $quien, string $id): array
    {
        $paquete = $this->paqueteConAcceso($quien, $id);
        $modulo = $this->moduloCompleto($paquete->modulo_id);
        if (! $this->configuracionDe($paquete->modulo_id)) {
            throw ErrorHttp::solicitudInvalida('El modulo ya no tiene un juego configurado');
        }
        if (! class_exists(ZipArchive::class)) {
            throw new ErrorHttp(500, 'Falta la extension zip de PHP: activala en el hosting (Select PHP Version > Extensions)');
        }

        $temporal = tempnam(sys_get_temp_dir(), 'ludus-scorm-');
        $zip = new ZipArchive;
        $zip->open($temporal, ZipArchive::OVERWRITE);
        foreach (self::ARCHIVOS_PLANTILLA as $archivo) {
            $zip->addFile(__DIR__."/plantilla/{$archivo}", $archivo);
        }
        $zip->addFromString('configuracion.js', $this->archivoConfiguracion($paquete->token));
        $zip->addFromString('imsmanifest.xml', $this->manifiesto(
            $paquete,
            "{$modulo->curso->nombre} - {$modulo->titulo}",
            $modulo->titulo,
        ));
        $zip->addFromString('LEEME.txt', $this->instruccionesDeUso($modulo->curso->nombre, $modulo->titulo));
        $zip->close();

        $contenido = file_get_contents($temporal);
        @unlink($temporal);

        return ['nombreArchivo' => 'ludus-'.$this->nombreSeguro($modulo->titulo).'.zip', 'contenido' => $contenido];
    }

    /* ---------------------------------------------------------------- *
     * Ejecucion del paquete dentro del LMS (publico)
     * ---------------------------------------------------------------- */

    /** Datos minimos para pintar la pantalla de login; no expone configuracion. */
    public function informacionPublica(string $token): array
    {
        $paquete = $this->paqueteActivo($token);
        $modulo = $this->moduloCompleto($paquete->modulo_id);
        $configuracion = $this->configuracionDe($paquete->modulo_id);

        return [
            'modulo' => ['titulo' => $modulo->titulo, 'descripcion' => $modulo->descripcion],
            'curso' => ['nombre' => $modulo->curso->nombre],
            'juego' => $configuracion ? ['nombre' => $configuracion->juego->nombre] : null,
        ];
    }

    /**
     * Login del estudiante desde el LMS. Ademas de validar la contrasena,
     * exige que sea estudiante y que este inscrito en el curso del modulo.
     */
    public function ingresar(string $token, string $correo, string $clave): array
    {
        $paquete = $this->paqueteActivo($token);
        $modulo = $this->moduloCompleto($paquete->modulo_id);
        $configuracion = $this->configuracionDe($paquete->modulo_id);
        if (! $configuracion) {
            throw ErrorHttp::solicitudInvalida('El modulo ya no tiene un juego configurado');
        }

        $sesion = $this->autenticacion->ingresar($correo, $clave);
        if ($sesion['usuario']['rol'] !== Rol::ESTUDIANTE) {
            throw ErrorHttp::prohibido('Este modulo solo puede abrirlo un estudiante');
        }
        $inscrito = Inscripcion::where('estudiante_id', $sesion['usuario']['sub'])
            ->where('curso_id', $modulo->curso_id)
            ->exists();
        if (! $inscrito) {
            throw ErrorHttp::prohibido('No estas inscrito en el curso de este modulo');
        }

        $juego = $configuracion->juego;

        return [
            'tokenAcceso' => $sesion['tokenAcceso'],
            'estudiante' => ['nombre' => $sesion['usuario']['nombre'], 'correo' => $sesion['usuario']['correo']],
            'modulo' => ['titulo' => $modulo->titulo, 'califica' => $modulo->califica],
            'juego' => [
                'clave' => $juego->clave,
                'jugable' => $juego->jugable,
                'nombre' => $juego->nombre,
                'descripcion' => $juego->descripcion,
            ],
            'configuracion' => [
                'titulo' => $configuracion->titulo,
                'instrucciones' => $configuracion->instrucciones,
                'velocidad' => $configuracion->velocidad,
                'tiempoLimiteSegundos' => $configuracion->tiempo_limite_segundos,
                'intentosPermitidos' => $configuracion->intentos_permitidos,
                'puntajeMaximo' => $configuracion->puntaje_maximo,
            ],
        ];
    }

    public function armarPartida(string $token, UsuarioAutenticado $quien): array
    {
        $paquete = $this->paqueteActivo($token);

        return $this->juegos->armarPartida($quien, $paquete->modulo_id);
    }

    public function verificarCaso(string $casoId, string $decision): array
    {
        return $this->juegos->verificarCaso($casoId, $decision);
    }

    public function terminarPartida(string $token, UsuarioAutenticado $quien, array $respuestas): array
    {
        $paquete = $this->paqueteActivo($token);
        $modulo = $this->moduloCompleto($paquete->modulo_id);
        $datos = $this->juegos->terminarPartida($quien, $paquete->modulo_id, $respuestas);

        return [...$datos, 'califica' => $modulo->califica];
    }

    /** Guarda el intento en Ludus y devuelve lo que el lanzador reporta al LMS. */
    public function registrarResultado(string $token, UsuarioAutenticado $quien, int $puntaje): array
    {
        $paquete = $this->paqueteActivo($token);
        $modulo = $this->moduloCompleto($paquete->modulo_id);
        $configuracion = $this->configuracionDe($paquete->modulo_id);
        $resultado = $this->resultados->crear($quien, $paquete->modulo_id, $puntaje);

        return [
            'intento' => $resultado->intento,
            'puntaje' => $resultado->puntaje,
            'nota' => $resultado->nota,
            'califica' => $modulo->califica,
            'puntajeMaximo' => $configuracion?->puntaje_maximo ?? 100,
        ];
    }

    /* ---------------------------------------------------------------- *
     * Apoyo
     * ---------------------------------------------------------------- */

    private function urlApi(): string
    {
        return config('ludus.url_publica_api');
    }

    private function advertenciaDeUrl(string $urlApi): ?string
    {
        if (preg_match('/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|\/|$)/i', $urlApi)) {
            return "Los paquetes apuntan a {$urlApi}, que es esta misma computadora. "
                .'Desde un LMS real el estudiante no puede alcanzarla: publica Ludus en '
                .'una direccion accesible, ponla en URL_PUBLICA_API y vuelve a exportar.';
        }
        // Una IP de red local tampoco sirve: el navegador del estudiante esta
        // en otra red, y ademas bloquea que un sitio publico pida a una red
        // privada.
        if (preg_match('/^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/', $urlApi)) {
            return "Los paquetes apuntan a {$urlApi}, que es una direccion de red local. "
                .'Solo funciona si el estudiante esta en la misma red, y los navegadores '
                .'bloquean que un LMS publico pida a una red privada. Publica Ludus en '
                .'una direccion de internet y vuelve a exportar.';
        }
        if (str_starts_with($urlApi, 'http://')) {
            return "Los paquetes apuntan a {$urlApi}, que es HTTP. Si tu LMS se sirve por "
                .'HTTPS, el navegador va a bloquear las peticiones; usa HTTPS en '
                .'URL_PUBLICA_API.';
        }

        return null;
    }

    private function configuracionDe(string $moduloId): ?ConfiguracionJuego
    {
        return ConfiguracionJuego::with('juego')->where('modulo_id', $moduloId)->first();
    }

    private function paqueteActivo(string $token): PaqueteScorm
    {
        $paquete = PaqueteScorm::where('token', $token)->first();
        if (! $paquete) {
            throw ErrorHttp::noEncontrado('El paquete no existe');
        }
        if (! $paquete->activo) {
            throw ErrorHttp::noAutorizado('El docente desactivo este paquete');
        }

        return $paquete;
    }

    private function moduloCompleto(string $moduloId): ModuloCurso
    {
        $modulo = ModuloCurso::with('curso')->find($moduloId);
        if (! $modulo) {
            throw ErrorHttp::noEncontrado('Modulo no encontrado');
        }

        return $modulo;
    }

    private function moduloConAcceso(UsuarioAutenticado $quien, string $moduloId): ModuloCurso
    {
        $modulo = $this->moduloCompleto($moduloId);
        if ($quien->es(Rol::SUPERADMIN)) {
            return $modulo;
        }
        if ($modulo->curso->institucion_id !== $quien->institucionId) {
            throw ErrorHttp::prohibido('No tienes acceso a este modulo');
        }
        if ($quien->es(Rol::DOCENTE) && $modulo->curso->docente_id !== $quien->id) {
            throw ErrorHttp::prohibido('Solo el docente del curso puede exportar este modulo');
        }

        return $modulo;
    }

    private function paqueteConAcceso(UsuarioAutenticado $quien, string $id): PaqueteScorm
    {
        $paquete = PaqueteScorm::find($id);
        if (! $paquete) {
            throw ErrorHttp::noEncontrado('El paquete no existe');
        }
        $this->moduloConAcceso($quien, $paquete->modulo_id);

        return $paquete;
    }

    private function archivoConfiguracion(string $token): string
    {
        $comoJson = fn (string $texto) => json_encode($texto, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        return implode("\n", [
            '/* Generado por Ludus al exportar el paquete. */',
            'window.LUDUS_CONFIG = {',
            '  urlApi: '.$comoJson($this->urlApi()).',',
            '  token: '.$comoJson($token),
            '};',
            '',
        ]);
    }

    private function manifiesto(PaqueteScorm $paquete, string $tituloOrganizacion, string $tituloItem): string
    {
        $identificador = 'LUDUS-'.strtoupper(substr($paquete->token, 0, 12));
        $archivos = implode("\n", array_map(
            fn ($archivo) => "      <file href=\"{$archivo}\" />",
            [...self::ARCHIVOS_PLANTILLA, 'configuracion.js']
        ));
        $organizacion = $this->escaparXml($tituloOrganizacion);
        $item = $this->escaparXml($tituloItem);

        return <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="{$identificador}" version="1.2"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="ORG-LUDUS">
    <organization identifier="ORG-LUDUS">
      <title>{$organizacion}</title>
      <item identifier="ITEM-LUDUS" identifierref="RES-LUDUS" isvisible="true">
        <title>{$item}</title>
        <adlcp:masteryscore>60</adlcp:masteryscore>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-LUDUS" type="webcontent" adlcp:scormtype="sco" href="index.html">
{$archivos}
    </resource>
  </resources>
</manifest>

XML;
    }

    private function instruccionesDeUso(string $nombreCurso, string $tituloModulo): string
    {
        $urlApi = $this->urlApi();
        $advertencia = $this->advertenciaDeUrl($urlApi);

        return implode("\n", [
            'Paquete SCORM 1.2 generado por Ludus',
            '=====================================',
            '',
            "Curso:  {$nombreCurso}",
            "Modulo: {$tituloModulo}",
            '',
            'Como usarlo:',
            '1. Sube este ZIP tal cual como actividad SCORM en tu LMS (Moodle,',
            '   Blackboard, Canvas u otro compatible con SCORM 1.2).',
            '2. Al abrirlo, el estudiante inicia sesion con su cuenta de Ludus.',
            '3. Solo pueden entrar estudiantes inscritos en el curso del modulo.',
            '4. Al terminar, el intento queda registrado en Ludus y el puntaje se',
            '   reporta al LMS (score.raw y lesson_status).',
            '',
            "Este paquete consulta la API de Ludus en: {$urlApi}",
            'Esa direccion debe ser alcanzable desde el navegador del estudiante.',
            '',
            ...($advertencia ? ['ATENCION', '--------', ...$this->enLineas($advertencia), ''] : []),
        ]);
    }

    /** Parte un texto en lineas de ancho razonable para el LEEME.txt. */
    private function enLineas(string $texto, int $ancho = 72): array
    {
        $lineas = [];
        $actual = '';
        foreach (explode(' ', $texto) as $palabra) {
            if ($actual !== '' && strlen("{$actual} {$palabra}") > $ancho) {
                $lineas[] = $actual;
                $actual = $palabra;
            } else {
                $actual = $actual !== '' ? "{$actual} {$palabra}" : $palabra;
            }
        }
        if ($actual !== '') {
            $lineas[] = $actual;
        }

        return $lineas;
    }

    private function escaparXml(string $texto): string
    {
        return str_replace(['&', '<', '>', '"', "'"], ['&amp;', '&lt;', '&gt;', '&quot;', '&apos;'], $texto);
    }

    private function nombreSeguro(string $texto): string
    {
        $seguro = trim(preg_replace('/[^a-z0-9]+/', '-', mb_strtolower($texto)), '-');

        return $seguro !== '' ? $seguro : 'modulo';
    }
}
