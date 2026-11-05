import { MigrationInterface, QueryRunner } from 'typeorm';
import { randomUUID } from 'crypto';
import { CLAVE_AJEDREZ, JUEGO_AJEDREZ } from '../juegos/catalogo-nuevos';
import { BANCO_BASE_AJEDREZ } from '../juegos/ajedrez/banco-base';

/**
 * Ajedrez de Preguntas (evaluacion).
 *
 * - bancos_ajedrez: preguntas de cuatro opciones (con marca de dificil), los
 *   minutos de la partida y el minimo de preguntas para calificar sin examen.
 * - partidas_ajedrez: cada partida, con las preguntas que el servidor dio y
 *   como se respondieron. De ahi sale la nota.
 * - El juego en el catalogo y un banco de ejemplo en el catalogo base.
 */
export class AjedrezConPreguntas1792000000003 implements MigrationInterface {
  name = 'AjedrezConPreguntas1792000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "bancos_ajedrez" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" character varying(140) NOT NULL,
        "preguntas" jsonb NOT NULL DEFAULT '[]',
        "minutos" integer NOT NULL DEFAULT 0,
        "minimo_preguntas" integer NOT NULL DEFAULT 5,
        "institucion_id" uuid,
        "creado_en" TIMESTAMP NOT NULL DEFAULT now(),
        "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_bancos_ajedrez" PRIMARY KEY ("id"),
        CONSTRAINT "FK_bancos_ajedrez_institucion" FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "partidas_ajedrez" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "modulo_id" uuid NOT NULL,
        "estudiante_id" uuid NOT NULL,
        "banco_id" uuid NOT NULL,
        "preguntas" jsonb NOT NULL DEFAULT '[]',
        "estado" character varying(12) NOT NULL DEFAULT 'jugando',
        "desenlace" character varying(12),
        "minutos" integer NOT NULL,
        "minimo_preguntas" integer NOT NULL,
        "critica_fallada" boolean NOT NULL DEFAULT false,
        "puntaje" integer,
        "nota" character varying(8),
        "intento" integer,
        "iniciada_en" TIMESTAMP NOT NULL DEFAULT now(),
        "terminada_en" TIMESTAMP,
        CONSTRAINT "PK_partidas_ajedrez" PRIMARY KEY ("id"),
        CONSTRAINT "FK_partidas_ajedrez_modulo" FOREIGN KEY ("modulo_id") REFERENCES "modulos_curso"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_partidas_ajedrez_estudiante" FOREIGN KEY ("estudiante_id") REFERENCES "usuarios"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_partidas_ajedrez_estudiante" ON "partidas_ajedrez" ("estudiante_id")`);

    const j = JUEGO_AJEDREZ;
    await queryRunner.query(
      `INSERT INTO "juegos" ("clave", "nombre", "categoria", "icono", "eslogan", "descripcion", "parametros", "jugable", "tipo")
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, true, $8)
       ON CONFLICT ("clave") DO NOTHING`,
      [j.clave, j.nombre, j.categoria, j.icono, j.eslogan, j.descripcion, JSON.stringify(j.parametros), j.tipo],
    );

    const b = BANCO_BASE_AJEDREZ;
    // En el banco de ejemplo la primera opcion de cada pregunta es la correcta.
    const preguntas = b.preguntas.map((p) => {
      const opciones = p.opciones.map((texto) => ({ id: randomUUID(), texto }));
      return { id: randomUUID(), texto: p.texto, opciones, correctaId: opciones[0].id, dificil: p.dificil };
    });
    await queryRunner.query(
      `INSERT INTO "bancos_ajedrez" ("nombre", "preguntas", "minutos", "minimo_preguntas") VALUES ($1, $2::jsonb, $3, $4)`,
      [b.nombre, JSON.stringify(preguntas), b.minutos, b.minimoPreguntas],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "configuraciones_juego" WHERE "juego_id" IN (SELECT "id" FROM "juegos" WHERE "clave" = $1)`,
      [CLAVE_AJEDREZ],
    );
    await queryRunner.query(`DELETE FROM "juegos" WHERE "clave" = $1`, [CLAVE_AJEDREZ]);
    await queryRunner.query(`DROP TABLE "partidas_ajedrez"`);
    await queryRunner.query(`DROP TABLE "bancos_ajedrez"`);
  }
}
