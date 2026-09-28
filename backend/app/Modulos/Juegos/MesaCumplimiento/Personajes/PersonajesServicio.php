<?php

namespace App\Modulos\Juegos\MesaCumplimiento\Personajes;

use App\Excepciones\ErrorHttp;
use App\Modelos\Personaje;
use App\Modulos\Archivos\ArchivosServicio;
use App\Soporte\Rol;
use App\Soporte\UsuarioAutenticado;

class PersonajesServicio
{
    /**
     * Nombre que le pone guardarImagen a lo que se sube desde la aplicacion.
     * Sirve para distinguirlo de los assets que alguien dejo a mano en la
     * carpeta, que nunca se borran solos.
     */
    private const PATRON_SUBIDA = '/\/[0-9a-f]{16}\.(png|jpg|webp)$/';

    public function __construct(private readonly ArchivosServicio $archivos) {}

    /** Los propios de la institucion mas el catalogo base de Ludus. */
    public function listar(UsuarioAutenticado $quien)
    {
        $consulta = Personaje::orderByRaw('institucion_id ASC NULLS LAST')->orderBy('nombre');

        if (! $quien->es(Rol::SUPERADMIN)) {
            $consulta->where(fn ($donde) => $donde
                ->where('institucion_id', $quien->institucionParaFiltrar())
                ->orWhereNull('institucion_id'));
        }

        return $consulta->get();
    }

    /** Imagenes en la carpeta que todavia no son un personaje registrado. */
    public function imagenesDisponibles(): array
    {
        $usadas = Personaje::pluck('imagen')->flip();

        return array_values(array_filter(
            $this->archivos->listarImagenes(ArchivosServicio::CARPETA_PERSONAJES),
            fn ($ruta) => ! $usadas->has($ruta)
        ));
    }

    public function crear(UsuarioAutenticado $quien, array $datos): Personaje
    {
        return Personaje::create([
            'nombre' => $datos['nombre'],
            'cargo' => $datos['cargo'] ?? '',
            'imagen' => $this->resolverImagen($datos),
            // El catalogo base es del superadmin; el resto crea para su institucion.
            'institucion_id' => $quien->es(Rol::SUPERADMIN) ? null : $quien->institucionId,
        ])->fresh();
    }

    public function actualizar(UsuarioAutenticado $quien, string $id, array $datos): Personaje
    {
        $personaje = $this->conAcceso($quien, $id);

        if (array_key_exists('nombre', $datos)) {
            $personaje->nombre = $datos['nombre'];
        }
        if (array_key_exists('cargo', $datos)) {
            $personaje->cargo = $datos['cargo'];
        }
        if (! empty($datos['imagenSubida']) || ! empty($datos['imagenExistente'])) {
            $anterior = $personaje->imagen;
            $personaje->imagen = $this->resolverImagen($datos);
            $this->limpiarSiEsSubida($anterior, $personaje->id);
        }
        $personaje->save();

        return $personaje;
    }

    public function eliminar(UsuarioAutenticado $quien, string $id): void
    {
        $personaje = $this->conAcceso($quien, $id);
        $personaje->delete();
        $this->limpiarSiEsSubida($personaje->imagen, null);
    }

    /* ---------------------------------------------------------------- */

    private function resolverImagen(array $datos): string
    {
        if (! empty($datos['imagenSubida'])) {
            return $this->archivos->guardarImagen(ArchivosServicio::CARPETA_PERSONAJES, $datos['imagenSubida']);
        }
        if (! empty($datos['imagenExistente'])) {
            $enCarpeta = $this->archivos->listarImagenes(ArchivosServicio::CARPETA_PERSONAJES);
            if (! in_array($datos['imagenExistente'], $enCarpeta, true)) {
                throw ErrorHttp::solicitudInvalida('Esa imagen ya no esta en el servidor');
            }

            return $datos['imagenExistente'];
        }

        throw ErrorHttp::solicitudInvalida('El personaje necesita una imagen');
    }

    /**
     * Borra del disco una imagen subida desde la aplicacion cuando deja de
     * usarse. Los archivos que alguien copio a mano en la carpeta se
     * conservan: vuelven a aparecer como imagen disponible.
     */
    private function limpiarSiEsSubida(string $imagen, ?string $exceptoId): void
    {
        if (! preg_match(self::PATRON_SUBIDA, $imagen)) {
            return;
        }
        $consulta = Personaje::where('imagen', $imagen);
        if ($exceptoId) {
            $consulta->where('id', '!=', $exceptoId);
        }
        if (! $consulta->exists()) {
            $this->archivos->eliminarImagen($imagen);
        }
    }

    /** El catalogo base solo lo toca el superadmin. */
    private function conAcceso(UsuarioAutenticado $quien, string $id): Personaje
    {
        $personaje = Personaje::find($id);
        if (! $personaje) {
            throw ErrorHttp::noEncontrado('El personaje no existe');
        }
        if ($quien->es(Rol::SUPERADMIN)) {
            return $personaje;
        }
        if ($personaje->institucion_id === null) {
            throw ErrorHttp::prohibido('Los personajes del catalogo base solo los edita el superadmin');
        }
        if ($personaje->institucion_id !== $quien->institucionId) {
            throw ErrorHttp::prohibido('No tienes acceso a este personaje');
        }

        return $personaje;
    }
}
