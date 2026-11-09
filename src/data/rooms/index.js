import { testRoom } from './testRoom.js';
import { house } from './house.js';

// Registro de habitaciones por id. Para agregar una sala nueva: crea su archivo y súmala aquí.
export const ROOMS = {
  [testRoom.id]: testRoom,
  [house.id]: house,
};

// Sala con la que empieza una partida nueva (después de elegir personaje).
// La sala de prueba sigue disponible: cambia esto a 'testRoom' para jugarla.
export const START_ROOM = house.id;
