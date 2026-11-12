import { PlayTimer } from './PlayTimer.js';
import { RoomFlags } from './RoomFlags.js';
import { currentCharacter } from '../data/characters.js';
import { loadPlayerName } from './playerName.js';

// Partida nueva en la sala indicada: el timer global arranca en 0 y los flags de las salas se limpian.
// La usan la comanda del nombre (sala inicial) y el menú de desarrollo (cualquier sala).
export function startNewGame(scene, roomId) {
  PlayTimer.start(scene.registry);
  RoomFlags.reset(scene.registry);
  scene.registry.set('deaths', 0); // contador de corrientazos de la pantalla de Game Over

  scene.scene.start('Game', { roomId });
}

// Fin del juego → tabla de tiempos en modo resultado. Para el timer y fija los datos de la partida en este
// momento (así un reintento de envío manda exactamente lo mismo). `key` identifica esta partida terminada:
// Leaderboard.submitScore no la manda dos veces aunque se reintente.
// TODO: la llamará el final (el restaurante de la Seño); por ahora solo F9 en desarrollo (GameScene).
export function goToResults(scene) {
  const registry = scene.registry;
  PlayTimer.pause(registry);
  const score = {
    // Si se entró por el menú de desarrollo no pasó por la comanda: se usa el último nombre guardado.
    name: registry.get('playerName') ?? loadPlayerName() ?? 'Jugador',
    character: currentCharacter(registry).texture,
    timeMs: PlayTimer.elapsed(registry),
    deaths: registry.get('deaths') ?? 0,
  };
  scene.scene.start('Leaderboard', { mode: 'result', score, key: `${Date.now()}-${Math.random()}` });
}
