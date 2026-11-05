/**
 * Entrada para el paquete SCORM: expone el motor, las reglas de captura y el bot en
 * window.LudusAjedrez. `npm run ajedrez:scorm` lo compila a
 * backend/src/scorm/plantilla/ajedrez-motor.js (archivo generado: no se edita
 * a mano, se regenera despues de cambiar motor.ts o bot.ts).
 */
import * as motor from './motor';
import { elegirJugada } from './bot';
import * as capturas from './capturas';

(window as unknown as { LudusAjedrez: unknown }).LudusAjedrez = { ...motor, ...capturas, elegirJugada };
