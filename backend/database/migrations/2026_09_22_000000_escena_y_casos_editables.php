<?php

use App\Soporte\Migraciones;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Personajes (los CEO que aparecen en escena) y casos de cumplimiento
 * editables.
 *
 * Los 13 casos del curso entran a la tabla como catalogo base
 * (institucion_id en null): desde aqui el docente los edita o los duplica a
 * su institucion. Si las tablas ya existen, no se toca nada.
 */
return new class extends Migration
{
    public function up(): void
    {
        $id = Migraciones::idPorDefecto();

        if (! Schema::hasTable('personajes')) {
            DB::statement("
                CREATE TABLE \"personajes\" (
                    \"id\" uuid NOT NULL {$id},
                    \"nombre\" character varying(120) NOT NULL,
                    \"cargo\" character varying(120) NOT NULL DEFAULT '',
                    \"imagen\" character varying(300) NOT NULL,
                    \"institucion_id\" uuid,
                    \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(),
                    \"actualizado_en\" TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT \"PK_personajes\" PRIMARY KEY (\"id\")
                )
            ");
            DB::statement('
                ALTER TABLE "personajes"
                ADD CONSTRAINT "FK_personajes_institucion"
                FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE
            ');
        }

        if (Schema::hasTable('casos_cumplimiento')) {
            return;
        }

        DB::statement("
            CREATE TABLE \"casos_cumplimiento\" (
                \"id\" uuid NOT NULL {$id},
                \"entidad\" character varying(160) NOT NULL,
                \"tipo\" character varying(160) NOT NULL DEFAULT '',
                \"jurisdiccion\" character varying(160) NOT NULL DEFAULT '',
                \"solicitud\" character varying(200) NOT NULL DEFAULT '',
                \"registro_licencia\" text NOT NULL DEFAULT '',
                \"travel_rule\" text NOT NULL DEFAULT '',
                \"beneficiario_final\" text NOT NULL DEFAULT '',
                \"controles_aml\" text NOT NULL DEFAULT '',
                \"sanciones\" text NOT NULL DEFAULT '',
                \"exposicion_onchain\" text NOT NULL DEFAULT '',
                \"campos_extra\" jsonb NOT NULL DEFAULT '[]',
                \"decision_correcta\" character varying(12) NOT NULL,
                \"regla\" character varying(200) NOT NULL DEFAULT '',
                \"explicacion\" text NOT NULL DEFAULT '',
                \"origen\" character varying(160) NOT NULL DEFAULT '',
                \"personaje_id\" uuid,
                \"institucion_id\" uuid,
                \"activo\" boolean NOT NULL DEFAULT true,
                \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(),
                \"actualizado_en\" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT \"PK_casos_cumplimiento\" PRIMARY KEY (\"id\")
            )
        ");
        DB::statement('
            ALTER TABLE "casos_cumplimiento"
            ADD CONSTRAINT "FK_casos_personaje"
            FOREIGN KEY ("personaje_id") REFERENCES "personajes"("id") ON DELETE SET NULL
        ');
        DB::statement('
            ALTER TABLE "casos_cumplimiento"
            ADD CONSTRAINT "FK_casos_institucion"
            FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE
        ');

        // Catalogo base: el mismo contenido que traia el curso, ahora editable.
        foreach (require database_path('datos/casos_base.php') as $caso) {
            DB::table('casos_cumplimiento')->insert([
                ...$caso,
                'id' => (string) Str::uuid(),
                'campos_extra' => json_encode($caso['campos_extra'], JSON_UNESCAPED_UNICODE),
                'institucion_id' => null,
            ]);
        }
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS "casos_cumplimiento"');
        DB::statement('DROP TABLE IF EXISTS "personajes"');
    }
};
