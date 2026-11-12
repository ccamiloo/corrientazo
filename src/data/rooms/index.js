import { testRoom } from './testRoom.js';
import { house } from './house.js';
import { street_1 } from './street_1.js';
import { park } from './park.js';
import { market } from './market.js';
import { construction } from './construction.js';

// Registro de habitaciones por id. Para agregar una sala nueva: crea su archivo y súmala aquí.
export const ROOMS = {
  [testRoom.id]: testRoom,
  [house.id]: house,
  [street_1.id]: street_1,
  [park.id]: park,
  [market.id]: market,
  [construction.id]: construction,
};

// Sala con la que empieza una partida nueva (después de elegir personaje).
// La sala de prueba sigue disponible: cambia esto a 'testRoom' para jugarla.
export const START_ROOM = house.id;

// Orden de los niveles en una partida (cada uno es una sala). Lo usa la partida guardada para mostrar el número.
export const LEVEL_ORDER = [house.id, street_1.id, park.id, market.id, construction.id];
