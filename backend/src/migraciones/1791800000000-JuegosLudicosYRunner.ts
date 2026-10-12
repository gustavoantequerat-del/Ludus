import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  CLAVE_MAHJONG,
  CLAVE_MEMORAMA,
  CLAVE_RUNNER,
  JUEGO_MAHJONG,
  JUEGO_MEMORAMA,
  JUEGO_RUNNER,
  iconosBase,
} from '../juegos/catalogo-nuevos';

/**
 * Juegos de evaluacion y juegos ludicos.
 *
 * - juegos.tipo separa el catalogo en dos sectores. Los ludicos no generan
 *   calificacion.
 * - El Memorama deja de ser maqueta, y entran el Mahjong y el Runner
 *   Narrativo.
 * - configuraciones_juego.ajustes guarda lo propio de cada juego (que mazo,
 *   cuantas rondas, que historia) sin una columna por parametro.
 * - mazos: los iconos, la ficha y el fondo del Memorama y del Mahjong.
 * - historias: los videos y preguntas del Runner Narrativo.
 */
export class JuegosLudicosYRunner1791800000000 implements MigrationInterface {
  name = 'JuegosLudicosYRunner1791800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "juegos" ADD "tipo" character varying(12) NOT NULL DEFAULT 'evaluacion'`,
    );

    const m = JUEGO_MEMORAMA;
    await queryRunner.query(
      `UPDATE "juegos"
         SET "nombre" = $2, "categoria" = $3, "icono" = $4, "eslogan" = $5,
             "descripcion" = $6, "parametros" = $7::jsonb, "jugable" = true, "tipo" = $8
       WHERE "clave" = $1`,
      [m.clave, m.nombre, m.categoria, m.icono, m.eslogan, m.descripcion, JSON.stringify(m.parametros), m.tipo],
    );

    for (const juego of [JUEGO_MAHJONG, JUEGO_RUNNER, JUEGO_MEMORAMA]) {
      await queryRunner.query(
        `INSERT INTO "juegos" ("clave", "nombre", "categoria", "icono", "eslogan", "descripcion", "parametros", "jugable", "tipo")
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true, $8)
         ON CONFLICT ("clave") DO NOTHING`,
        [juego.clave, juego.nombre, juego.categoria, juego.icono, juego.eslogan, juego.descripcion, JSON.stringify(juego.parametros), juego.tipo],
      );
    }

    await queryRunner.query(
      `ALTER TABLE "configuraciones_juego" ADD "ajustes" jsonb NOT NULL DEFAULT '{}'`,
    );

    // Un modulo que ya tenia un juego ludico deja de calificar.
    await queryRunner.query(`
      UPDATE "modulos_curso" SET "califica" = false
      WHERE "id" IN (
        SELECT "configuracion"."modulo_id" FROM "configuraciones_juego" "configuracion"
        JOIN "juegos" "juego" ON "juego"."id" = "configuracion"."juego_id"
        WHERE "juego"."tipo" = 'ludico'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "mazos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "juego_clave" character varying(60) NOT NULL,
        "nombre" character varying(120) NOT NULL,
        "iconos" jsonb NOT NULL DEFAULT '[]',
        "imagen_ficha" character varying(300),
        "fondo" character varying(300),
        "institucion_id" uuid,
        "creado_en" TIMESTAMP NOT NULL DEFAULT now(),
        "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_mazos" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "mazos" ADD CONSTRAINT "FK_mazos_institucion"
      FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`CREATE INDEX "IDX_mazos_juego" ON "mazos" ("juego_clave")`);

    for (const clave of [CLAVE_MEMORAMA, CLAVE_MAHJONG] as const) {
      await queryRunner.query(
        `INSERT INTO "mazos" ("juego_clave", "nombre", "iconos") VALUES ($1, 'Clasico', $2::jsonb)`,
        [clave, JSON.stringify(iconosBase(clave))],
      );
    }

    await queryRunner.query(`
      CREATE TABLE "historias" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" character varying(140) NOT NULL,
        "video_intro" character varying(300),
        "preguntas" jsonb NOT NULL DEFAULT '[]',
        "institucion_id" uuid,
        "creado_en" TIMESTAMP NOT NULL DEFAULT now(),
        "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_historias" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "historias" ADD CONSTRAINT "FK_historias_institucion"
      FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "historias"`);
    await queryRunner.query(`DROP TABLE "mazos"`);
    await queryRunner.query(`ALTER TABLE "configuraciones_juego" DROP COLUMN "ajustes"`);
    // Los modulos que tenian estos juegos vuelven a quedar sin juego.
    await queryRunner.query(
      `DELETE FROM "configuraciones_juego" WHERE "juego_id" IN (SELECT "id" FROM "juegos" WHERE "clave" IN ($1, $2))`,
      [CLAVE_MAHJONG, CLAVE_RUNNER],
    );
    await queryRunner.query(`DELETE FROM "juegos" WHERE "clave" IN ($1, $2)`, [CLAVE_MAHJONG, CLAVE_RUNNER]);
    await queryRunner.query(`UPDATE "juegos" SET "jugable" = false WHERE "clave" = $1`, [CLAVE_MEMORAMA]);
    await queryRunner.query(`ALTER TABLE "juegos" DROP COLUMN "tipo"`);
  }
}
