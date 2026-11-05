/**
 * Banco de ejemplo del catalogo base: sirve para probar el juego sin escribir
 * preguntas. Lo carga la migracion; despues se edita como cualquier banco
 * (solo el superadmin) o se duplica a mano en uno propio.
 */
export const BANCO_BASE_AJEDREZ = {
  nombre: 'Cultura general (ejemplo)',
  minutos: 15,
  minimoPreguntas: 5,
  preguntas: [
    { texto: 'Cuanto es 7 x 8?', opciones: ['56', '54', '64', '48'], dificil: false },
    { texto: 'Cual es la capital de Bolivia (sede de gobierno)?', opciones: ['La Paz', 'Santa Cruz', 'Cochabamba', 'Lima'], dificil: false },
    { texto: 'Cuantos lados tiene un hexagono?', opciones: ['6', '5', '7', '8'], dificil: false },
    { texto: 'Que planeta es conocido como el planeta rojo?', opciones: ['Marte', 'Venus', 'Jupiter', 'Saturno'], dificil: false },
    { texto: 'Cual es el resultado de 2 elevado a la 5?', opciones: ['32', '25', '16', '10'], dificil: false },
    { texto: 'Que gas necesitan las plantas para la fotosintesis?', opciones: ['Dioxido de carbono', 'Oxigeno', 'Nitrogeno', 'Helio'], dificil: false },
    { texto: 'En que continente esta Egipto?', opciones: ['Africa', 'Asia', 'Europa', 'Oceania'], dificil: false },
    { texto: 'Cuantos minutos tiene un dia?', opciones: ['1440', '1200', '1600', '960'], dificil: false },
    { texto: 'Cual es el oceano mas grande?', opciones: ['Pacifico', 'Atlantico', 'Indico', 'Artico'], dificil: false },
    { texto: 'Cual es la raiz cuadrada de 169?', opciones: ['13', '12', '14', '17'], dificil: true },
    { texto: 'Que elemento quimico tiene el simbolo Fe?', opciones: ['Hierro', 'Fluor', 'Fosforo', 'Francio'], dificil: true },
    { texto: 'En que anio llego Colon a America?', opciones: ['1492', '1498', '1500', '1488'], dificil: true },
  ],
};
