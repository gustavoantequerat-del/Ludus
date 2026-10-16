import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Datos de catalogo de los juegos que nunca pasaron de maqueta visual. Viven
 * aqui solo para que `down` pueda devolverlos.
 */
const JUEGOS_MAQUETA = [
  {
    clave: 'viborita-numerica',
    nombre: 'Viborita Numerica',
    categoria: 'Arcade',
    icono: 'worm',
    eslogan: 'La vibora crece comiendo solo las respuestas correctas.',
    descripcion: 'Guia la vibora hacia el resultado correcto. Cada acierto la hace crecer; un error cuesta una vida.',
    parametros: ['Velocidad', 'Pares', 'Vidas'],
  },
  {
    clave: 'torre-de-bloques',
    nombre: 'Torre de Bloques',
    categoria: 'Logica',
    icono: 'blocks',
    eslogan: 'Encaja la pieza donde coincide el concepto.',
    descripcion:
      'Las piezas caen con un valor; encajalas en la columna que corresponde antes de que la torre llegue arriba.',
    parametros: ['Caida', 'Niveles', 'Piezas'],
  },
  {
    clave: 'burbujas',
    nombre: 'Burbujas',
    categoria: 'Velocidad',
    icono: 'circle-dot',
    eslogan: 'Revienta la burbuja con la equivalencia correcta.',
    descripcion: 'Las burbujas suben con valores; revienta solo las equivalentes al objetivo del nivel.',
    parametros: ['Flujo', 'Objetivo', 'Vidas'],
  },
  {
    clave: 'ordena-la-secuencia',
    nombre: 'Ordena la Secuencia',
    categoria: 'Logica',
    icono: 'arrow-down-up',
    eslogan: 'Arrastra los elementos hasta el orden correcto.',
    descripcion: 'Arrastra las piezas hasta formar la secuencia correcta antes de que termine el tiempo.',
    parametros: ['Elementos', 'Tiempo', 'Intentos'],
  },
  {
    clave: 'laberinto',
    nombre: 'Laberinto',
    categoria: 'Arcade',
    icono: 'map',
    eslogan: 'Avanza por el camino que resuelve la pista.',
    descripcion: 'Recorre el laberinto tomando en cada bifurcacion el camino que responde a la pista.',
    parametros: ['Tamano', 'Pistas', 'Vidas'],
  },
];

/**
 * Quita del catalogo los juegos que no estan programados (jugable = false).
 *
 * Los modulos que los usaban se quedan sin juego: siguen existiendo, con sus
 * resultados historicos, y el docente puede asignarles uno real. Los paquetes
 * SCORM de esos modulos tambien siguen: leen la configuracion en vivo, asi
 * que vuelven a funcionar en cuanto el modulo tenga juego.
 */
export class QuitarJuegosMaqueta1792000000000 implements MigrationInterface {
  name = 'QuitarJuegosMaqueta1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "configuraciones_juego"
      WHERE "juego_id" IN (SELECT "id" FROM "juegos" WHERE "jugable" = false)
    `);
    await queryRunner.query(`DELETE FROM "juegos" WHERE "jugable" = false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const j of JUEGOS_MAQUETA) {
      await queryRunner.query(
        `INSERT INTO "juegos" ("clave", "nombre", "categoria", "icono", "eslogan", "descripcion", "parametros", "jugable", "tipo")
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, false, 'evaluacion')
         ON CONFLICT ("clave") DO NOTHING`,
        [j.clave, j.nombre, j.categoria, j.icono, j.eslogan, j.descripcion, JSON.stringify(j.parametros)],
      );
    }
  }
}
