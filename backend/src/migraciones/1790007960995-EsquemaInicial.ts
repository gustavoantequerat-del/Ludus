import { MigrationInterface, QueryRunner } from "typeorm";

export class EsquemaInicial1790007960995 implements MigrationInterface {
    name = 'EsquemaInicial1790007960995'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "juegos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(80) NOT NULL, "categoria" character varying(40) NOT NULL, "icono" character varying(40) NOT NULL, "eslogan" character varying(200) NOT NULL, "descripcion" text NOT NULL, "parametros" jsonb NOT NULL DEFAULT '[]', CONSTRAINT "PK_c24230175818db5b1d251cebb75" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "configuraciones_juego" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "modulo_id" uuid NOT NULL, "juego_id" uuid NOT NULL, "titulo" character varying(140) NOT NULL, "instrucciones" text NOT NULL DEFAULT '', "velocidad" character varying(10) NOT NULL DEFAULT 'media', "tiempo_limite_segundos" integer NOT NULL DEFAULT '180', "pares_contenido" integer NOT NULL DEFAULT '8', "intentos_permitidos" integer NOT NULL DEFAULT '3', "puntaje_maximo" integer NOT NULL DEFAULT '100', "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_816abc8fa4d837fd83cbca8fc32" UNIQUE ("modulo_id"), CONSTRAINT "REL_816abc8fa4d837fd83cbca8fc3" UNIQUE ("modulo_id"), CONSTRAINT "PK_855db23b17043430c4a51cb7c0d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "modulos_curso" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "curso_id" uuid NOT NULL, "titulo" character varying(140) NOT NULL, "descripcion" text NOT NULL DEFAULT '', "orden" integer NOT NULL, "califica" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c6adea160ff81d485be37bc7caf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "cursos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(140) NOT NULL, "descripcion" text NOT NULL DEFAULT '', "institucion_id" uuid NOT NULL, "docente_id" uuid, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_391c5a635ef6b4bd0a46cb75653" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "rutas_cursos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ruta_id" uuid NOT NULL, "curso_id" uuid NOT NULL, "orden" integer NOT NULL, CONSTRAINT "PK_281f324add7896fe5e76bc18224" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "rutas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(140) NOT NULL, "descripcion" text NOT NULL DEFAULT '', "institucion_id" uuid NOT NULL, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_80408b869ec5168c98210b8eba8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "instituciones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(120) NOT NULL, "dominio" character varying(160) NOT NULL, "activa" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_60eb94939a002fe5b01e5b378ef" UNIQUE ("dominio"), CONSTRAINT "PK_4be89b4d1536e4588a73f2247d8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."usuarios_rol_enum" AS ENUM('superadmin', 'admin_institucion', 'docente', 'estudiante')`);
        await queryRunner.query(`CREATE TABLE "usuarios" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying(120) NOT NULL, "correo" character varying(160) NOT NULL, "clave_hash" character varying(200) NOT NULL, "rol" "public"."usuarios_rol_enum" NOT NULL, "institucion_id" uuid, "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_63665765c1a778a770c9bd585d" ON "usuarios" ("correo") `);
        await queryRunner.query(`CREATE TABLE "resultados" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "estudiante_id" uuid NOT NULL, "modulo_id" uuid NOT NULL, "intento" integer NOT NULL, "puntaje" integer NOT NULL, "nota" numeric(4,1), "creado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b5c208f402f18d0ac82ae19b0d2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."solicitudes_tipo_enum" AS ENUM('ingreso', 'salida')`);
        await queryRunner.query(`CREATE TYPE "public"."solicitudes_estado_enum" AS ENUM('pendiente', 'aprobada', 'rechazada')`);
        await queryRunner.query(`CREATE TABLE "solicitudes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "estudiante_id" uuid NOT NULL, "tipo" "public"."solicitudes_tipo_enum" NOT NULL, "curso_id" uuid, "ruta_id" uuid, "estado" "public"."solicitudes_estado_enum" NOT NULL DEFAULT 'pendiente', "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8c7e99758c774b801853b538647" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "inscripciones" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "estudiante_id" uuid NOT NULL, "curso_id" uuid, "ruta_id" uuid, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_17a12f6ab342f6762d81e940d19" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "configuraciones_juego" ADD CONSTRAINT "FK_816abc8fa4d837fd83cbca8fc32" FOREIGN KEY ("modulo_id") REFERENCES "modulos_curso"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "configuraciones_juego" ADD CONSTRAINT "FK_cda26b356c7a3a0bd0f688ec07f" FOREIGN KEY ("juego_id") REFERENCES "juegos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "modulos_curso" ADD CONSTRAINT "FK_0ff3495ae0d7d37f71205343381" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cursos" ADD CONSTRAINT "FK_d6e0ce42aba5e19da4d5329fc46" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "cursos" ADD CONSTRAINT "FK_8c39b6011fb5a0da2a7c8f1b5dd" FOREIGN KEY ("docente_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rutas_cursos" ADD CONSTRAINT "FK_4b8d00a9270fba00475153bbbe4" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rutas_cursos" ADD CONSTRAINT "FK_e6934e58917b161aaaceb3f4027" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "rutas" ADD CONSTRAINT "FK_970405bfa2a904d01fe37fd0e92" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usuarios" ADD CONSTRAINT "FK_38dcba13a9fe5b43e50ea013803" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "resultados" ADD CONSTRAINT "FK_97fae6e95a91e4b5f28dd348387" FOREIGN KEY ("estudiante_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "resultados" ADD CONSTRAINT "FK_17d587a565ce9921f64920d36fc" FOREIGN KEY ("modulo_id") REFERENCES "modulos_curso"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "solicitudes" ADD CONSTRAINT "FK_6d700f5c1a279fe36d0deb75879" FOREIGN KEY ("estudiante_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "solicitudes" ADD CONSTRAINT "FK_0d1b863f480ced80a8233475a01" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "solicitudes" ADD CONSTRAINT "FK_744b87ee191e5dc3de506ae23be" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inscripciones" ADD CONSTRAINT "FK_562e7adc0f4986a76bfc4243bc7" FOREIGN KEY ("estudiante_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inscripciones" ADD CONSTRAINT "FK_ca2673ce13cdc1695c39955cde8" FOREIGN KEY ("curso_id") REFERENCES "cursos"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "inscripciones" ADD CONSTRAINT "FK_55dc1a5ede5e03da59bffb3a0f2" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "inscripciones" DROP CONSTRAINT "FK_55dc1a5ede5e03da59bffb3a0f2"`);
        await queryRunner.query(`ALTER TABLE "inscripciones" DROP CONSTRAINT "FK_ca2673ce13cdc1695c39955cde8"`);
        await queryRunner.query(`ALTER TABLE "inscripciones" DROP CONSTRAINT "FK_562e7adc0f4986a76bfc4243bc7"`);
        await queryRunner.query(`ALTER TABLE "solicitudes" DROP CONSTRAINT "FK_744b87ee191e5dc3de506ae23be"`);
        await queryRunner.query(`ALTER TABLE "solicitudes" DROP CONSTRAINT "FK_0d1b863f480ced80a8233475a01"`);
        await queryRunner.query(`ALTER TABLE "solicitudes" DROP CONSTRAINT "FK_6d700f5c1a279fe36d0deb75879"`);
        await queryRunner.query(`ALTER TABLE "resultados" DROP CONSTRAINT "FK_17d587a565ce9921f64920d36fc"`);
        await queryRunner.query(`ALTER TABLE "resultados" DROP CONSTRAINT "FK_97fae6e95a91e4b5f28dd348387"`);
        await queryRunner.query(`ALTER TABLE "usuarios" DROP CONSTRAINT "FK_38dcba13a9fe5b43e50ea013803"`);
        await queryRunner.query(`ALTER TABLE "rutas" DROP CONSTRAINT "FK_970405bfa2a904d01fe37fd0e92"`);
        await queryRunner.query(`ALTER TABLE "rutas_cursos" DROP CONSTRAINT "FK_e6934e58917b161aaaceb3f4027"`);
        await queryRunner.query(`ALTER TABLE "rutas_cursos" DROP CONSTRAINT "FK_4b8d00a9270fba00475153bbbe4"`);
        await queryRunner.query(`ALTER TABLE "cursos" DROP CONSTRAINT "FK_8c39b6011fb5a0da2a7c8f1b5dd"`);
        await queryRunner.query(`ALTER TABLE "cursos" DROP CONSTRAINT "FK_d6e0ce42aba5e19da4d5329fc46"`);
        await queryRunner.query(`ALTER TABLE "modulos_curso" DROP CONSTRAINT "FK_0ff3495ae0d7d37f71205343381"`);
        await queryRunner.query(`ALTER TABLE "configuraciones_juego" DROP CONSTRAINT "FK_cda26b356c7a3a0bd0f688ec07f"`);
        await queryRunner.query(`ALTER TABLE "configuraciones_juego" DROP CONSTRAINT "FK_816abc8fa4d837fd83cbca8fc32"`);
        await queryRunner.query(`DROP TABLE "inscripciones"`);
        await queryRunner.query(`DROP TABLE "solicitudes"`);
        await queryRunner.query(`DROP TYPE "public"."solicitudes_estado_enum"`);
        await queryRunner.query(`DROP TYPE "public"."solicitudes_tipo_enum"`);
        await queryRunner.query(`DROP TABLE "resultados"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_63665765c1a778a770c9bd585d"`);
        await queryRunner.query(`DROP TABLE "usuarios"`);
        await queryRunner.query(`DROP TYPE "public"."usuarios_rol_enum"`);
        await queryRunner.query(`DROP TABLE "instituciones"`);
        await queryRunner.query(`DROP TABLE "rutas"`);
        await queryRunner.query(`DROP TABLE "rutas_cursos"`);
        await queryRunner.query(`DROP TABLE "cursos"`);
        await queryRunner.query(`DROP TABLE "modulos_curso"`);
        await queryRunner.query(`DROP TABLE "configuraciones_juego"`);
        await queryRunner.query(`DROP TABLE "juegos"`);
    }

}
