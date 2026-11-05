import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Cada institucion tiene un codigo de registro: con el, un estudiante nuevo
 * crea su propia cuenta desde la landing. Las instituciones que ya existen
 * reciben un codigo al azar (8 caracteres, sin 0/O/1/I/L), que el admin puede
 * ver y renovar.
 */
export class CodigoRegistro1792000000004 implements MigrationInterface {
  name = 'CodigoRegistro1792000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "instituciones" ADD "codigo_registro" character varying(12)`);
    // Un codigo distinto por fila: 8 letras del alfabeto sin ambiguos, al azar.
    await queryRunner.query(`
      UPDATE "instituciones" SET "codigo_registro" = (
        SELECT string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
        FROM generate_series(1, 8 + 0 * length("instituciones"."id"::text))
      )
    `);
    await queryRunner.query(`ALTER TABLE "instituciones" ALTER COLUMN "codigo_registro" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "instituciones" ADD CONSTRAINT "UQ_instituciones_codigo_registro" UNIQUE ("codigo_registro")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "instituciones" DROP CONSTRAINT "UQ_instituciones_codigo_registro"`);
    await queryRunner.query(`ALTER TABLE "instituciones" DROP COLUMN "codigo_registro"`);
  }
}
