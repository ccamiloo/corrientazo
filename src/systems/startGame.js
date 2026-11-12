import * as Phaser from 'phaser';
import { PlayTimer } from './PlayTimer.js';
import { ENDING } from '../config/constants.js';
import { RoomFlags } from './RoomFlags.js';
import { currentCharacter } from '../data/characters.js';
import { loadPlayerName } from './playerName.js';
import { SaveGame } from './SaveGame.js';

// Partida nueva en la sala indicada: el timer global arranca en 0 y los flags de las salas se limpian.
// La usan la comanda del nombre (sala inicial) y el menú de desarrollo (cualquier sala).
export function startNewGame(scene, roomId) {
  PlayTimer.start(scene.registry);
  RoomFlags.reset(scene.registry);
  scene.registry.set('deaths', 0); // contador de corrientazos de la pantalla de Game Over

  scene.scene.start('Game', { roomId });
}

// Fin del juego → escena final (restaurante de la Seño) → tabla de tiempos en modo resultado. Para el timer
// (la escena final no cuenta) y fija los datos de la partida en este momento, así un reintento de envío manda
// exactamente lo mismo. `key` identifica esta partida terminada: Leaderboard.submitScore no la manda dos veces
// aunque se reintente. La llaman el final de la obra y F9 en desarrollo (GameScene).
// Mientras dura el fundido, `scene.finishing` congela el juego (GameScene ni actualiza ni deja morir).
export function goToResults(scene) {
  if (scene.finishing) return;
  scene.finishing = true;
  const registry = scene.registry;
  PlayTimer.pause(registry);
  // Partida terminada: ya no hay nada que continuar (y no se guarda más mientras corre el final).
  registry.set('currentRoom', null);
  SaveGame.clear();
  const score = {
    // Si se entró por el menú de desarrollo no pasó por la comanda: se usa el último nombre guardado.
    name: registry.get('playerName') ?? loadPlayerName() ?? 'Jugador',
    character: currentCharacter(registry).texture,
    timeMs: PlayTimer.elapsed(registry),
    deaths: registry.get('deaths') ?? 0,
  };
  const data = { score, key: `${Date.now()}-${Math.random()}` };
  const cam = scene.cameras.main;
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start('Ending', data));
  cam.fadeOut(ENDING.fadeMs, 0, 0, 0);
}
