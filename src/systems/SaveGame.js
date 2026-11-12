import { PlayTimer } from './PlayTimer.js';
import { sanitizeName } from './playerName.js';
import { CHARACTERS } from '../data/characters.js';
import { ROOMS, LEVEL_ORDER } from '../data/rooms/index.js';

// Partida guardada en el navegador (localStorage), para seguir donde se quedó al volver a abrir la página.
//
// Qué se guarda: la sala en curso, el personaje, el nombre, el tiempo acumulado, las muertes y los flags de las
// salas (lo hecho en la sala actual, p. ej. la luz ya cortada en la calle). Al continuar se reaparece en el
// inicio de esa sala con todo eso; el tiempo no se pierde ni se regala.
//
// Cuándo: al entrar a cada sala, cada pocos segundos mientras se juega (GameScene), al morir y al irse la página a
// segundo plano (Lifecycle). Se borra al terminar el juego (goToResults).
//
// `registry.currentRoom` dice si hay una partida en curso que guardar: lo pone GameScene al crearse y lo quita
// goToResults. Fuera del juego (menús) no se guarda nada nuevo.
//
// localStorage puede no existir o lanzar (modo privado, almacenamiento bloqueado): todo va en try/catch y sin él
// el juego funciona igual, solo que no se puede continuar.

const KEY = 'corrientazo.save';
const VERSION = 1;

export const SaveGame = {
  // Guarda la partida en curso, si la hay.
  saveCurrent(registry) {
    const roomId = registry.get('currentRoom');
    if (!roomId) return;
    const data = {
      v: VERSION,
      roomId,
      characterIndex: registry.get('characterIndex') ?? 0,
      name: registry.get('playerName') ?? null,
      elapsedMs: Math.floor(PlayTimer.elapsed(registry)),
      deaths: registry.get('deaths') ?? 0,
      flags: registry.get('roomFlags') ?? {},
      savedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // sin almacenamiento: no se puede continuar después, nada más
    }
  },

  // La partida guardada, validada, o null. Lo que venga raro (otra versión, sala que ya no existe) se ignora.
  load() {
    try {
      const data = JSON.parse(window.localStorage.getItem(KEY));
      if (!data || data.v !== VERSION || !ROOMS[data.roomId] || !LEVEL_ORDER.includes(data.roomId)) return null;
      if (!Number.isFinite(data.elapsedMs) || data.elapsedMs < 0) return null;
      return {
        ...data,
        characterIndex: Math.min(Math.max(0, data.characterIndex | 0), CHARACTERS.length - 1),
        name: data.name ? sanitizeName(data.name).trim() || null : null,
        deaths: Math.max(0, data.deaths | 0),
        flags: data.flags && typeof data.flags === 'object' ? data.flags : {},
      };
    } catch {
      return null;
    }
  },

  clear() {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      // nada que borrar
    }
  },

  // Número de nivel (1-5) de una sala, para mostrar "Continuar: nivel 3".
  levelNumber(roomId) {
    return LEVEL_ORDER.indexOf(roomId) + 1;
  },

  // Restaura la partida guardada en el registry y entra a su sala. El timer sigue corriendo desde donde quedó.
  continueGame(scene, save) {
    const { registry } = scene;
    registry.set('characterIndex', save.characterIndex);
    if (save.name) registry.set('playerName', save.name);
    registry.set('deaths', save.deaths);
    registry.set('roomFlags', JSON.parse(JSON.stringify(save.flags)));
    PlayTimer.start(registry);
    PlayTimer.tick(registry, save.elapsedMs);
    scene.scene.start('Game', { roomId: save.roomId });
  },
};
