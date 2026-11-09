import { PlayTimer } from './PlayTimer.js';
import { RoomFlags } from './RoomFlags.js';

// Partida nueva en la sala indicada: el timer global arranca en 0 y los flags de las salas se limpian.
// La usan la selección de personaje (sala inicial) y el menú de desarrollo (cualquier sala).
export function startNewGame(scene, roomId) {
  PlayTimer.start(scene.registry);
  RoomFlags.reset(scene.registry);
  scene.scene.start('Game', { roomId });
}
