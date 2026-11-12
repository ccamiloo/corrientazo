import { createTestRoomLevel } from './testRoomLevel.js';
import { createHouseLevel } from './houseLevel.js';
import { createStreet1Level } from './street1Level.js';
import { createParkLevel } from './parkLevel.js';
import { createMarketLevel } from './marketLevel.js';
import { createConstructionLevel } from './constructionLevel.js';

// Scripts de sala, por nombre (campo `script` de cada sala). Cada uno recibe la GameScene ya armada
// (sala, jugador, diálogo) y devuelve { interactables, update?, ... }.
export const LEVELS = {
  testRoom: createTestRoomLevel,
  house: createHouseLevel,
  street_1: createStreet1Level,
  park: createParkLevel,
  market: createMarketLevel,
  construction: createConstructionLevel,
};
