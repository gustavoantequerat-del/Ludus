<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Clave estable y marca "jugable" en el catalogo de juegos, y el primer juego
 * con mecanica real: la Mesa de Cumplimiento.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('juegos', 'clave')) {
            // La columna se agrega nullable para poder rellenar el catalogo
            // que ya existe; recien despues se vuelve obligatoria y unica.
            DB::statement('ALTER TABLE "juegos" ADD "clave" character varying(60)');
            DB::statement('ALTER TABLE "juegos" ADD "jugable" boolean NOT NULL DEFAULT false');
            DB::statement('UPDATE "juegos" SET "clave" = lower(replace("nombre", \' \', \'-\')) WHERE "clave" IS NULL');
            DB::statement('ALTER TABLE "juegos" ALTER COLUMN "clave" SET NOT NULL');
            DB::statement('CREATE UNIQUE INDEX "IDX_ef417ff3e1efef2e0f1a1a737a" ON "juegos" ("clave")');
        }

        // El catalogo lo mantiene el equipo de desarrollo: se agrega aqui para
        // que las instalaciones ya sembradas tambien reciban el juego nuevo.
        DB::insert(
            'INSERT INTO "juegos" ("id", "clave", "nombre", "categoria", "icono", "eslogan", "descripcion", "parametros", "jugable")
             VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb, true)
             ON CONFLICT ("clave") DO NOTHING',
            [
                (string) Str::uuid(),
                'mesa-cumplimiento',
                'Mesa de Cumplimiento',
                'Decision',
                'shield-check',
                'Aprueba o rechaza fintechs segun su expediente.',
                'Llegan solicitudes de PSAV y VASP a tu escritorio. Revisa el expediente y decide: aprobar, aprobar con debida diligencia reforzada o rechazar. Aprobar de mas y rechazar por reflejo cuentan como error.',
                '["Casos", "Tiempo", "Intentos"]',
            ]
        );
    }

    public function down(): void
    {
        DB::statement('DELETE FROM "juegos" WHERE "clave" = \'mesa-cumplimiento\'');
        DB::statement('DROP INDEX IF EXISTS "public"."IDX_ef417ff3e1efef2e0f1a1a737a"');
        DB::statement('ALTER TABLE "juegos" DROP COLUMN IF EXISTS "jugable"');
        DB::statement('ALTER TABLE "juegos" DROP COLUMN IF EXISTS "clave"');
    }
};
