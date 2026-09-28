<?php

namespace App\Modulos\Archivos;

use App\Excepciones\ErrorHttp;

/**
 * Guarda en disco las imagenes que sube el docente.
 *
 * Llegan como data URL dentro del JSON (no multipart) porque el navegador ya
 * sabe leer un archivo a base64 y el volumen es chico: una foto por
 * personaje. Se sirven tal cual en /archivos/<carpeta>/<archivo>.
 */
class ArchivosServicio
{
    public const BASE_PUBLICA = '/archivos';

    public const CARPETA_PERSONAJES = 'personajes';

    public const CARPETA_FONDOS = 'fondos';

    /**
     * Fondo de la Mesa de Cumplimiento. Es una convencion de nombre, no un
     * registro en la base: basta con dejar el archivo en archivos/fondos/ para
     * que el juego lo use. Si no existe, la escena cae al degradado de respaldo.
     */
    public const FONDO_MESA = self::BASE_PUBLICA.'/'.self::CARPETA_FONDOS.'/mesa-cumplimiento.png';

    private const TIPOS_PERMITIDOS = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/webp' => 'webp',
    ];

    /** Tope por imagen ya decodificada. */
    private const MAXIMO_BYTES = 3 * 1024 * 1024;

    private const PATRON_DATA_URL = '/^data:([a-z\/+-]+);base64,([A-Za-z0-9+\/=\s]+)$/D';

    public function raiz(): string
    {
        return rtrim(config('ludus.ruta_archivos'), '/\\');
    }

    /**
     * Escribe la imagen y devuelve su ruta publica (/archivos/...), que es lo
     * que se guarda en la base y consume el navegador.
     */
    public function guardarImagen(string $carpeta, string $dataUrl): string
    {
        if (! preg_match(self::PATRON_DATA_URL, trim($dataUrl), $partes)) {
            throw ErrorHttp::solicitudInvalida('La imagen no tiene un formato valido');
        }

        [, $tipo, $base64] = $partes;
        $extension = self::TIPOS_PERMITIDOS[$tipo] ?? null;
        if (! $extension) {
            throw ErrorHttp::solicitudInvalida('Solo se aceptan imagenes PNG, JPG o WEBP');
        }

        $contenido = (string) base64_decode($base64);
        if (strlen($contenido) === 0) {
            throw ErrorHttp::solicitudInvalida('La imagen esta vacia');
        }
        if (strlen($contenido) > self::MAXIMO_BYTES) {
            throw ErrorHttp::solicitudInvalida('La imagen supera los 3 MB');
        }

        $directorio = $this->raiz().DIRECTORY_SEPARATOR.$carpeta;
        if (! is_dir($directorio) && ! @mkdir($directorio, 0775, true) && ! is_dir($directorio)) {
            throw new ErrorHttp(500, "No se pudo crear la carpeta {$directorio}: revisa RUTA_ARCHIVOS y sus permisos");
        }

        $nombre = bin2hex(random_bytes(8)).".{$extension}";
        if (@file_put_contents($directorio.DIRECTORY_SEPARATOR.$nombre, $contenido) === false) {
            throw new ErrorHttp(500, "No se pudo guardar la imagen en {$directorio}: revisa RUTA_ARCHIVOS y sus permisos");
        }

        return self::BASE_PUBLICA."/{$carpeta}/{$nombre}";
    }

    /**
     * Imagenes que hay en la carpeta, como rutas publicas.
     *
     * Es el camino para los assets que alguien deja a mano en el servidor: no
     * hace falta subirlos otra vez desde la aplicacion, aparecen solos para
     * que el docente les ponga nombre.
     */
    public function listarImagenes(string $carpeta): array
    {
        $directorio = $this->raiz().DIRECTORY_SEPARATOR.$carpeta;
        $entradas = is_dir($directorio) ? (scandir($directorio) ?: []) : [];

        $imagenes = array_values(array_filter(
            $entradas,
            fn ($nombre) => preg_match('/\.(png|jpe?g|webp)$/i', $nombre)
        ));
        sort($imagenes, SORT_STRING);

        return array_map(fn ($nombre) => self::BASE_PUBLICA."/{$carpeta}/{$nombre}", $imagenes);
    }

    /**
     * Borra una imagen subida. Solo actua sobre rutas propias: cualquier ruta
     * de afuera, o que intente salir de la carpeta, se ignora.
     */
    public function eliminarImagen(?string $rutaPublica): void
    {
        $archivo = $this->rutaEnDisco($rutaPublica);
        if ($archivo !== null && is_file($archivo)) {
            @unlink($archivo);
        }
    }

    /** Ruta en disco de /archivos/..., o null si no es una ruta valida. */
    public function rutaEnDisco(?string $rutaPublica): ?string
    {
        $prefijo = self::BASE_PUBLICA.'/';
        if (! $rutaPublica || ! str_starts_with($rutaPublica, $prefijo)) {
            return null;
        }
        $relativa = substr($rutaPublica, strlen($prefijo));
        if ($relativa === '' || str_contains($relativa, '..') || str_contains($relativa, "\0")) {
            return null;
        }

        return $this->raiz().DIRECTORY_SEPARATOR.$relativa;
    }
}
