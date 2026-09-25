import { MigrationInterface, QueryRunner } from 'typeorm';

export class JuegoJugable1790176439434 implements MigrationInterface {
  name = 'JuegoJugable1790176439434';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // La columna se agrega nullable para poder rellenar el catalogo que ya
    // existe; recien despues se vuelve obligatoria y unica.
    await queryRunner.query(`ALTER TABLE "juegos" ADD "clave" character varying(60)`);
    await queryRunner.query(
      `ALTER TABLE "juegos" ADD "jugable" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "juegos" SET "clave" = lower(replace("nombre", ' ', '-')) WHERE "clave" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "juegos" ALTER COLUMN "clave" SET NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ef417ff3e1efef2e0f1a1a737a" ON "juegos" ("clave")`,
    );

    // El catalogo lo mantiene el equipo de desarrollo: se agrega aqui para que
    // las instalaciones ya sembradas tambien reciban el juego nuevo.
    await queryRunner.query(`
      INSERT INTO "juegos" ("clave", "nombre", "categoria", "icono", "eslogan", "descripcion", "parametros", "jugable")
      VALUES (
        'mesa-cumplimiento',
        'Mesa de Cumplimiento',
        'Decision',
        'shield-check',
        'Aprueba o rechaza fintechs segun su expediente.',
        'Llegan solicitudes de PSAV y VASP a tu escritorio. Revisa el expediente y decide: aprobar, aprobar con debida diligencia reforzada o rechazar. Aprobar de mas y rechazar por reflejo cuentan como error.',
        '["Casos", "Tiempo", "Intentos"]'::jsonb,
        true
      )
      ON CONFLICT ("clave") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "juegos" WHERE "clave" = 'mesa-cumplimiento'`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ef417ff3e1efef2e0f1a1a737a"`);
    await queryRunner.query(`ALTER TABLE "juegos" DROP COLUMN "jugable"`);
    await queryRunner.query(`ALTER TABLE "juegos" DROP COLUMN "clave"`);
  }
}
