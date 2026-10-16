import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * accesos: cada inicio de sesion exitoso (con clave, con Google o desde un
 * paquete SCORM), con la IP y el navegador. Es el registro de "que cuenta
 * entro y cuando" que Google Analytics no puede guardar.
 */
export class RegistroAccesos1792000000001 implements MigrationInterface {
  name = 'RegistroAccesos1792000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "accesos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "usuario_id" uuid NOT NULL,
        "metodo" character varying(12) NOT NULL,
        "ip" character varying(64),
        "agente" character varying(300),
        "creado_en" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_accesos_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_accesos_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_accesos_usuario" ON "accesos" ("usuario_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_accesos_creado_en" ON "accesos" ("creado_en")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "accesos"`);
  }
}
