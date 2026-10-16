import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Los videos del Runner Narrativo pasan a ser links de YouTube o Google Drive
 * y Ludus deja de guardar MP4. Las rutas a videos subidos (/archivos/...) que
 * hubiera en una historia se vacian: esa pregunta queda "sin video" hasta que
 * el docente pegue un link. Los archivos que queden en archivos/videos/ ya no
 * los usa nada y se pueden borrar a mano.
 *
 * No tiene vuelta atras: `down` no puede saber que video habia.
 */
export class VideosRunnerPorLink1792000000002 implements MigrationInterface {
  name = 'VideosRunnerPorLink1792000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "historias" ALTER COLUMN "video_intro" TYPE character varying(500)`);
    await queryRunner.query(`UPDATE "historias" SET "video_intro" = NULL WHERE "video_intro" LIKE '/archivos/%'`);
    await queryRunner.query(`
      UPDATE "historias" SET "preguntas" = (
        SELECT COALESCE(jsonb_agg(
          "pregunta" || jsonb_build_object(
            'videoBueno', CASE WHEN "pregunta"->>'videoBueno' LIKE '/archivos/%' THEN NULL ELSE "pregunta"->'videoBueno' END,
            'videoMalo', CASE WHEN "pregunta"->>'videoMalo' LIKE '/archivos/%' THEN NULL ELSE "pregunta"->'videoMalo' END
          ) ORDER BY "orden"), '[]'::jsonb)
        FROM jsonb_array_elements("historias"."preguntas") WITH ORDINALITY AS t("pregunta", "orden")
      )
      WHERE "preguntas"::text LIKE '%/archivos/%'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "historias" ALTER COLUMN "video_intro" TYPE character varying(300)`);
  }
}
