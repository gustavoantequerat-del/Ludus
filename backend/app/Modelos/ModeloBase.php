<?php

namespace App\Modelos;

use DateTimeInterface;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Base de todos los modelos.
 *
 * La base guarda en snake_case (institucion_id) y la API habla en camelCase
 * (institucionId), igual que las entidades de TypeORM del backend anterior.
 * La traduccion se hace en un solo lugar, al serializar: dentro del codigo
 * PHP se usa siempre el nombre de la columna.
 */
abstract class ModeloBase extends Model
{
    use HasUuids;

    public const CREATED_AT = 'creado_en';

    public const UPDATED_AT = 'actualizado_en';

    /** Las relaciones se serializan con el nombre del metodo (configuracionJuego). */
    public static $snakeAttributes = false;

    protected $guarded = [];

    /** Con microsegundos, como now() de PostgreSQL: ordena bien lo creado en el mismo segundo. */
    protected $dateFormat = 'Y-m-d H:i:s.u';

    /** UUID v4, el mismo tipo que generaba la base con uuid_generate_v4(). */
    public function newUniqueId(): string
    {
        return (string) Str::uuid();
    }

    public function toArray(): array
    {
        $datos = [];
        foreach (parent::toArray() as $clave => $valor) {
            $datos[Str::camel($clave)] = $valor;
        }

        return $datos;
    }

    /** ISO 8601 en UTC con milisegundos, lo mismo que Date.toJSON() en Node. */
    protected function serializeDate(DateTimeInterface $fecha): string
    {
        return Carbon::instance($fecha)->utc()->format('Y-m-d\TH:i:s.v\Z');
    }
}
