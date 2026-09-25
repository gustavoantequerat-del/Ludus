import { MigrationInterface, QueryRunner } from "typeorm";

export class PaquetesScorm1790017599789 implements MigrationInterface {
    name = 'PaquetesScorm1790017599789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "paquetes_scorm" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "token" character varying(64) NOT NULL, "modulo_id" uuid NOT NULL, "creado_por_id" uuid, "activo" boolean NOT NULL DEFAULT true, "creado_en" TIMESTAMP NOT NULL DEFAULT now(), "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_15084c3d00fd2f33b429e92ca42" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a2c0968c5890d4cfb2f9f88aa8" ON "paquetes_scorm" ("token") `);
        await queryRunner.query(`ALTER TABLE "paquetes_scorm" ADD CONSTRAINT "FK_28b86f79efa46caddfb4ac5ac5b" FOREIGN KEY ("modulo_id") REFERENCES "modulos_curso"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "paquetes_scorm" ADD CONSTRAINT "FK_ef142c7f6df30507327e5b867d5" FOREIGN KEY ("creado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "paquetes_scorm" DROP CONSTRAINT "FK_ef142c7f6df30507327e5b867d5"`);
        await queryRunner.query(`ALTER TABLE "paquetes_scorm" DROP CONSTRAINT "FK_28b86f79efa46caddfb4ac5ac5b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a2c0968c5890d4cfb2f9f88aa8"`);
        await queryRunner.query(`DROP TABLE "paquetes_scorm"`);
    }

}
