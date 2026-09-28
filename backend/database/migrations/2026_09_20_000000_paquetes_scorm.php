<?php

use App\Soporte\Migraciones;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Paquetes SCORM exportados por modulo. Se salta si la tabla ya existe. */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('paquetes_scorm')) {
            return;
        }

        $id = Migraciones::idPorDefecto();

        DB::statement("CREATE TABLE \"paquetes_scorm\" (\"id\" uuid NOT NULL {$id}, \"token\" character varying(64) NOT NULL, \"modulo_id\" uuid NOT NULL, \"creado_por_id\" uuid, \"activo\" boolean NOT NULL DEFAULT true, \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(), \"actualizado_en\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_15084c3d00fd2f33b429e92ca42\" PRIMARY KEY (\"id\"))");
        DB::statement('CREATE UNIQUE INDEX "IDX_a2c0968c5890d4cfb2f9f88aa8" ON "paquetes_scorm" ("token")');
        DB::statement('ALTER TABLE "paquetes_scorm" ADD CONSTRAINT "FK_28b86f79efa46caddfb4ac5ac5b" FOREIGN KEY ("modulo_id") REFERENCES "modulos_curso"("id") ON DELETE CASCADE ON UPDATE NO ACTION');
        DB::statement('ALTER TABLE "paquetes_scorm" ADD CONSTRAINT "FK_ef142c7f6df30507327e5b867d5" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION');
    }

    public function down(): void
    {
        DB::statement('DROP TABLE IF EXISTS "paquetes_scorm"');
    }
};
