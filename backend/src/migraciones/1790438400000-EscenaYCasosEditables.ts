import { MigrationInterface, QueryRunner } from 'typeorm';
import { CASOS_BASE } from '../juegos/mesa-cumplimiento/casos';

/**
 * Personajes (los CEO que aparecen en escena) y casos de cumplimiento
 * editables.
 *
 * Los 13 casos que antes vivian en el codigo pasan a la tabla como catalogo
 * base (institucion_id en null): desde aqui el docente los edita o los duplica
 * a su institucion.
 */
export class EscenaYCasosEditables1790438400000 implements MigrationInterface {
  name = 'EscenaYCasosEditables1790438400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "personajes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" character varying(120) NOT NULL,
        "cargo" character varying(120) NOT NULL DEFAULT '',
        "imagen" character varying(300) NOT NULL,
        "institucion_id" uuid,
        "creado_en" TIMESTAMP NOT NULL DEFAULT now(),
        "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_personajes" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "personajes"
      ADD CONSTRAINT "FK_personajes_institucion"
      FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      CREATE TABLE "casos_cumplimiento" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "entidad" character varying(160) NOT NULL,
        "tipo" character varying(160) NOT NULL DEFAULT '',
        "jurisdiccion" character varying(160) NOT NULL DEFAULT '',
        "solicitud" character varying(200) NOT NULL DEFAULT '',
        "registro_licencia" text NOT NULL DEFAULT '',
        "travel_rule" text NOT NULL DEFAULT '',
        "beneficiario_final" text NOT NULL DEFAULT '',
        "controles_aml" text NOT NULL DEFAULT '',
        "sanciones" text NOT NULL DEFAULT '',
        "exposicion_onchain" text NOT NULL DEFAULT '',
        "campos_extra" jsonb NOT NULL DEFAULT '[]',
        "decision_correcta" character varying(12) NOT NULL,
        "regla" character varying(200) NOT NULL DEFAULT '',
        "explicacion" text NOT NULL DEFAULT '',
        "origen" character varying(160) NOT NULL DEFAULT '',
        "personaje_id" uuid,
        "institucion_id" uuid,
        "activo" boolean NOT NULL DEFAULT true,
        "creado_en" TIMESTAMP NOT NULL DEFAULT now(),
        "actualizado_en" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_casos_cumplimiento" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "casos_cumplimiento"
      ADD CONSTRAINT "FK_casos_personaje"
      FOREIGN KEY ("personaje_id") REFERENCES "personajes"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "casos_cumplimiento"
      ADD CONSTRAINT "FK_casos_institucion"
      FOREIGN KEY ("institucion_id") REFERENCES "instituciones"("id") ON DELETE CASCADE
    `);

    // Catalogo base: mismo contenido que traia el codigo, ahora editable.
    for (const caso of CASOS_BASE) {
      await queryRunner.query(
        `INSERT INTO "casos_cumplimiento" (
          "entidad", "tipo", "jurisdiccion", "solicitud",
          "registro_licencia", "travel_rule", "beneficiario_final",
          "controles_aml", "sanciones", "exposicion_onchain", "campos_extra",
          "decision_correcta", "regla", "explicacion", "origen", "institucion_id"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NULL)`,
        [
          caso.entidad,
          caso.tipo,
          caso.jurisdiccion,
          caso.solicitud,
          caso.registroLicencia,
          caso.travelRule,
          caso.beneficiarioFinal,
          caso.controlesAml,
          caso.sanciones,
          caso.exposicionOnchain,
          JSON.stringify(caso.camposExtra),
          caso.decisionCorrecta,
          caso.regla,
          caso.explicacion,
          caso.origen,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "casos_cumplimiento"`);
    await queryRunner.query(`DROP TABLE "personajes"`);
  }
}
