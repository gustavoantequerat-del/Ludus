import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Antes de la prueba en campo:
 *
 * 1. `partidas_juego`: la Mesa de Cumplimiento y el Runner Narrativo guardan
 *    su partida en el servidor (que se dio y que se respondio), como ya hacia
 *    el ajedrez. Asi la nota no depende de lo que mande el navegador.
 * 2. Un estudiante no puede quedar inscrito dos veces en el mismo curso o en
 *    la misma ruta: se borran los duplicados que hubiera (queda la inscripcion
 *    mas antigua) y se agrega un indice unico.
 * 3. Tampoco puede tener dos solicitudes pendientes iguales: se rechazan las
 *    repetidas (queda la mas antigua) y se agrega un indice unico parcial.
 * 4. Un modulo con juego ludico no califica (el puntaje lo manda el
 *    navegador): se apaga `califica` en los que lo tuvieran prendido.
 */
export class PartidasEIntegridad1792000000005 implements MigrationInterface {
  name = 'PartidasEIntegridad1792000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "partidas_juego" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "modulo_id" uuid NOT NULL,
        "estudiante_id" uuid NOT NULL,
        "juego" character varying(40) NOT NULL,
        "preguntas" jsonb NOT NULL DEFAULT '[]',
        "respondidas" integer NOT NULL DEFAULT 0,
        "terminada" boolean NOT NULL DEFAULT false,
        "iniciada_en" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_partidas_juego" PRIMARY KEY ("id"),
        CONSTRAINT "FK_partidas_juego_modulo" FOREIGN KEY ("modulo_id") REFERENCES "modulos_curso"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_partidas_juego_estudiante" FOREIGN KEY ("estudiante_id") REFERENCES "usuarios"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_partidas_juego_modulo_estudiante" ON "partidas_juego" ("modulo_id", "estudiante_id")`,
    );

    await queryRunner.query(`
      DELETE FROM "inscripciones" a USING "inscripciones" b
      WHERE a."estudiante_id" = b."estudiante_id"
        AND a."curso_id" IS NOT DISTINCT FROM b."curso_id"
        AND a."ruta_id" IS NOT DISTINCT FROM b."ruta_id"
        AND (a."creado_en", a."id") > (b."creado_en", b."id")
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inscripciones_curso" ON "inscripciones" ("estudiante_id", "curso_id") WHERE "curso_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_inscripciones_ruta" ON "inscripciones" ("estudiante_id", "ruta_id") WHERE "ruta_id" IS NOT NULL`,
    );

    await queryRunner.query(`
      UPDATE "solicitudes" a SET "estado" = 'rechazada'
      FROM "solicitudes" b
      WHERE a."estado" = 'pendiente' AND b."estado" = 'pendiente'
        AND a."estudiante_id" = b."estudiante_id" AND a."tipo" = b."tipo"
        AND a."curso_id" IS NOT DISTINCT FROM b."curso_id"
        AND a."ruta_id" IS NOT DISTINCT FROM b."ruta_id"
        AND (a."creado_en", a."id") > (b."creado_en", b."id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_solicitudes_pendiente" ON "solicitudes"
        ("estudiante_id", "tipo", COALESCE("curso_id", '00000000-0000-0000-0000-000000000000'), COALESCE("ruta_id", '00000000-0000-0000-0000-000000000000'))
        WHERE "estado" = 'pendiente'
    `);

    await queryRunner.query(`
      UPDATE "modulos_curso" SET "califica" = false
      WHERE "califica" = true AND "id" IN (
        SELECT c."modulo_id" FROM "configuraciones_juego" c
        JOIN "juegos" j ON j."id" = c."juego_id"
        WHERE j."tipo" = 'ludico'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "UQ_solicitudes_pendiente"`);
    await queryRunner.query(`DROP INDEX "UQ_inscripciones_ruta"`);
    await queryRunner.query(`DROP INDEX "UQ_inscripciones_curso"`);
    await queryRunner.query(`DROP TABLE "partidas_juego"`);
  }
}
