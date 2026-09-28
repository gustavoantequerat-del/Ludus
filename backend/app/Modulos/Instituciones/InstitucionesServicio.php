<?php

namespace App\Modulos\Instituciones;

use App\Excepciones\ErrorHttp;
use App\Modelos\Curso;
use App\Modelos\Institucion;
use App\Modelos\Usuario;
use App\Soporte\Rol;

class InstitucionesServicio
{
    /** Cada institucion con sus totales de docentes, estudiantes y cursos. */
    public function listar(): array
    {
        $instituciones = Institucion::orderBy('nombre')->get();
        if ($instituciones->isEmpty()) {
            return [];
        }
        $ids = $instituciones->pluck('id');

        $docentes = $this->contarUsuarios($ids, Rol::DOCENTE);
        $estudiantes = $this->contarUsuarios($ids, Rol::ESTUDIANTE);
        $cursos = Curso::whereIn('institucion_id', $ids)
            ->groupBy('institucion_id')
            ->selectRaw('institucion_id, COUNT(*) AS total')
            ->pluck('total', 'institucion_id');

        return $instituciones->map(fn (Institucion $institucion) => [
            ...$institucion->toArray(),
            'totalDocentes' => (int) ($docentes[$institucion->id] ?? 0),
            'totalEstudiantes' => (int) ($estudiantes[$institucion->id] ?? 0),
            'totalCursos' => (int) ($cursos[$institucion->id] ?? 0),
        ])->all();
    }

    public function obtener(string $id): Institucion
    {
        $institucion = Institucion::find($id);
        if (! $institucion) {
            throw ErrorHttp::noEncontrado('Institucion no encontrada');
        }

        return $institucion;
    }

    public function crear(array $datos): Institucion
    {
        return Institucion::create($this->columnas($datos))->fresh();
    }

    public function actualizar(string $id, array $datos): Institucion
    {
        $institucion = $this->obtener($id);
        $institucion->fill($this->columnas($datos))->save();

        return $institucion;
    }

    public function eliminar(string $id): void
    {
        $this->obtener($id)->delete();
    }

    private function contarUsuarios($ids, string $rol)
    {
        return Usuario::whereIn('institucion_id', $ids)
            ->where('rol', $rol)
            ->groupBy('institucion_id')
            ->selectRaw('institucion_id, COUNT(*) AS total')
            ->pluck('total', 'institucion_id');
    }

    /** Los campos del cuerpo que vinieron, con el nombre de su columna. */
    private function columnas(array $datos): array
    {
        return array_intersect_key($datos, array_flip(['nombre', 'dominio', 'activa']));
    }
}
