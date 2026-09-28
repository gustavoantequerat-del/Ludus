<?php

use App\Soporte\Migraciones;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Esquema inicial: instituciones, usuarios, cursos, modulos, rutas, juegos,
 * inscripciones, solicitudes y resultados.
 *
 * Es el mismo SQL que generaba TypeORM (mismos tipos, mismos nombres de
 * restricciones), asi una base creada por el backend anterior y una creada
 * aqui son identicas. Si la base ya tiene estas tablas (porque las creo
 * TypeORM) no se toca nada.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('usuarios')) {
            return;
        }

        $id = Migraciones::idPorDefecto();

        $sentencias = [
            "CREATE TABLE \"juegos\" (\"id\" uuid NOT NULL {$id}, \"nombre\" character varying(80) NOT NULL, \"categoria\" character varying(40) NOT NULL, \"icono\" character varying(40) NOT NULL, \"eslogan\" character varying(200) NOT NULL, \"descripcion\" text NOT NULL, \"parametros\" jsonb NOT NULL DEFAULT '[]', CONSTRAINT \"PK_c24230175818db5b1d251cebb75\" PRIMARY KEY (\"id\"))",
            "CREATE TABLE \"configuraciones_juego\" (\"id\" uuid NOT NULL {$id}, \"modulo_id\" uuid NOT NULL, \"juego_id\" uuid NOT NULL, \"titulo\" character varying(140) NOT NULL, \"instrucciones\" text NOT NULL DEFAULT '', \"velocidad\" character varying(10) NOT NULL DEFAULT 'media', \"tiempo_limite_segundos\" integer NOT NULL DEFAULT '180', \"pares_contenido\" integer NOT NULL DEFAULT '8', \"intentos_permitidos\" integer NOT NULL DEFAULT '3', \"puntaje_maximo\" integer NOT NULL DEFAULT '100', \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(), \"actualizado_en\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_816abc8fa4d837fd83cbca8fc32\" UNIQUE (\"modulo_id\"), CONSTRAINT \"REL_816abc8fa4d837fd83cbca8fc3\" UNIQUE (\"modulo_id\"), CONSTRAINT \"PK_855db23b17043430c4a51cb7c0d\" PRIMARY KEY (\"id\"))",
            "CREATE TABLE \"modulos_curso\" (\"id\" uuid NOT NULL {$id}, \"curso_id\" uuid NOT NULL, \"titulo\" character varying(140) NOT NULL, \"descripcion\" text NOT NULL DEFAULT '', \"orden\" integer NOT NULL, \"califica\" boolean NOT NULL DEFAULT true, \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(), \"actualizado_en\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_c6adea160ff81d485be37bc7caf\" PRIMARY KEY (\"id\"))",
            "CREATE TABLE \"cursos\" (\"id\" uuid NOT NULL {$id}, \"nombre\" character varying(140) NOT NULL, \"descripcion\" text NOT NULL DEFAULT '', \"institucion_id\" uuid NOT NULL, \"docente_id\" uuid, \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(), \"actualizado_en\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_391c5a635ef6b4bd0a46cb75653\" PRIMARY KEY (\"id\"))",
            "CREATE TABLE \"rutas_cursos\" (\"id\" uuid NOT NULL {$id}, \"ruta_id\" uuid NOT NULL, \"curso_id\" uuid NOT NULL, \"orden\" integer NOT NULL, CONSTRAINT \"PK_281f324add7896fe5e76bc18224\" PRIMARY KEY (\"id\"))",
            "CREATE TABLE \"rutas\" (\"id\" uuid NOT NULL {$id}, \"nombre\" character varying(140) NOT NULL, \"descripcion\" text NOT NULL DEFAULT '', \"institucion_id\" uuid NOT NULL, \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(), \"actualizado_en\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_80408b869ec5168c98210b8eba8\" PRIMARY KEY (\"id\"))",
            "CREATE TABLE \"instituciones\" (\"id\" uuid NOT NULL {$id}, \"nombre\" character varying(120) NOT NULL, \"dominio\" character varying(160) NOT NULL, \"activa\" boolean NOT NULL DEFAULT true, \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(), \"actualizado_en\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"UQ_60eb94939a002fe5b01e5b378ef\" UNIQUE (\"dominio\"), CONSTRAINT \"PK_4be89b4d1536e4588a73f2247d8\" PRIMARY KEY (\"id\"))",
            "CREATE TYPE \"public\".\"usuarios_rol_enum\" AS ENUM('superadmin', 'admin_institucion', 'docente', 'estudiante')",
            "CREATE TABLE \"usuarios\" (\"id\" uuid NOT NULL {$id}, \"nombre\" character varying(120) NOT NULL, \"correo\" character varying(160) NOT NULL, \"clave_hash\" character varying(200) NOT NULL, \"rol\" \"public\".\"usuarios_rol_enum\" NOT NULL, \"institucion_id\" uuid, \"activo\" boolean NOT NULL DEFAULT true, \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(), \"actualizado_en\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_d7281c63c176e152e4c531594a8\" PRIMARY KEY (\"id\"))",
            'CREATE UNIQUE INDEX "IDX_63665765c1a778a770c9bd585d" ON "usuarios" ("correo")',
            "CREATE TABLE \"resultados\" (\"id\" uuid NOT NULL {$id}, \"estudiante_id\" uuid NOT NULL, \"modulo_id\" uuid NOT NULL, \"intento\" integer NOT NULL, \"puntaje\" integer NOT NULL, \"nota\" numeric(4,1), \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_b5c208f402f18d0ac82ae19b0d2\" PRIMARY KEY (\"id\"))",
            "CREATE TYPE \"public\".\"solicitudes_tipo_enum\" AS ENUM('ingreso', 'salida')",
            "CREATE TYPE \"public\".\"solicitudes_estado_enum\" AS ENUM('pendiente', 'aprobada', 'rechazada')",
            "CREATE TABLE \"solicitudes\" (\"id\" uuid NOT NULL {$id}, \"estudiante_id\" uuid NOT NULL, \"tipo\" \"public\".\"solicitudes_tipo_enum\" NOT NULL, \"curso_id\" uuid, \"ruta_id\" uuid, \"estado\" \"public\".\"solicitudes_estado_enum\" NOT NULL DEFAULT 'pendiente', \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(), \"actualizado_en\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_8c7e99758c774b801853b538647\" PRIMARY KEY (\"id\"))",
            "CREATE TABLE \"inscripciones\" (\"id\" uuid NOT NULL {$id}, \"estudiante_id\" uuid NOT NULL, \"curso_id\" uuid, \"ruta_id\" uuid, \"creado_en\" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT \"PK_17a12f6ab342f6762d81e940d19\" PRIMARY KEY (\"id\"))",
            'ALTER TABLE "configuraciones_juego" ADD CONSTRAINT "FK_816abc8fa4d837fd83cbca8fc32" FOREIGN KEY ("modulo_id") REFERENCES "modulos_curso"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "configuraciones_juego" ADD CONSTRAINT "FK_cda26b356c7a3a0bd0f688ec07f" FOREIGN KEY ("juego_id") REFERENCES "juegos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION',
            'ALTER TABLE "modulos_curso" ADD CONSTRAINT "FK_0ff3495ae0d7d37f71205343381" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "cursos" ADD CONSTRAINT "FK_d6e0ce42aba5e19da4d5329fc46" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "cursos" ADD CONSTRAINT "FK_8c39b6011fb5a0da2a7c8f1b5dd" FOREIGN KEY ("docente_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION',
            'ALTER TABLE "rutas_cursos" ADD CONSTRAINT "FK_4b8d00a9270fba00475153bbbe4" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "rutas_cursos" ADD CONSTRAINT "FK_e6934e58917b161aaaceb3f4027" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "rutas" ADD CONSTRAINT "FK_970405bfa2a904d01fe37fd0e92" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "usuarios" ADD CONSTRAINT "FK_38dcba13a9fe5b43e50ea013803" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "resultados" ADD CONSTRAINT "FK_97fae6e95a91e4b5f28dd348387" FOREIGN KEY ("estudiante_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "resultados" ADD CONSTRAINT "FK_17d587a565ce9921f64920d36fc" FOREIGN KEY ("modulo_id") REFERENCES "modulos_curso"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "solicitudes" ADD CONSTRAINT "FK_6d700f5c1a279fe36d0deb75879" FOREIGN KEY ("estudiante_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "solicitudes" ADD CONSTRAINT "FK_0d1b863f480ced80a8233475a01" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "solicitudes" ADD CONSTRAINT "FK_744b87ee191e5dc3de506ae23be" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "inscripciones" ADD CONSTRAINT "FK_562e7adc0f4986a76bfc4243bc7" FOREIGN KEY ("estudiante_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "inscripciones" ADD CONSTRAINT "FK_ca2673ce13cdc1695c39955cde8" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
            'ALTER TABLE "inscripciones" ADD CONSTRAINT "FK_55dc1a5ede5e03da59bffb3a0f2" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE NO ACTION',
        ];

        foreach ($sentencias as $sentencia) {
            DB::statement($sentencia);
        }
    }

    public function down(): void
    {
        foreach (['inscripciones', 'solicitudes', 'resultados', 'usuarios', 'instituciones', 'rutas', 'rutas_cursos', 'cursos', 'modulos_curso', 'configuraciones_juego', 'juegos'] as $tabla) {
            DB::statement("DROP TABLE IF EXISTS \"{$tabla}\" CASCADE");
        }
        foreach (['solicitudes_estado_enum', 'solicitudes_tipo_enum', 'usuarios_rol_enum'] as $tipo) {
            DB::statement("DROP TYPE IF EXISTS \"public\".\"{$tipo}\"");
        }
    }
};
