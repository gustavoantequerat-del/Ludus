/**
 * Entrada para el paquete SCORM: expone el motor y el bot en
 * window.LudusAjedrez. `npm run ajedrez:scorm` lo compila a
 * backend/src/scorm/plantilla/ajedrez-motor.js (archivo generado: no se edita
 * a mano, se regenera despues de cambiar motor.ts o bot.ts).
 */
import * as motor from './motor';
import { elegirJugada } from './bot';

(window as unknown as { LudusAjedrez: unknown }).LudusAjedrez = { ...motor, elegirJugada };
