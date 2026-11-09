import { createTestRoomLevel } from './testRoomLevel.js';
import { createHouseLevel } from './houseLevel.js';

// Scripts de sala, por nombre (campo `script` de cada sala). Cada uno recibe la GameScene ya armada
// (sala, jugador, diálogo) y devuelve { interactables, update?, ... }.
export const LEVELS = {
  testRoom: createTestRoomLevel,
  house: createHouseLevel,
};
