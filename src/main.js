import * as Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CharacterSelectScene } from './scenes/CharacterSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { DevMenuScene } from './scenes/DevMenuScene.js';
import { NameEntryScene } from './scenes/NameEntryScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';
import { EndingScene } from './scenes/EndingScene.js';
import { Leaderboard } from './systems/Leaderboard.js';
import { Device } from './systems/Device.js';
import { TouchControls } from './systems/TouchControls.js';
import { Lifecycle } from './systems/Lifecycle.js';
import { Fullscreen } from './systems/Fullscreen.js';

const config = {
  // AUTO elige WebGL (en Phaser 4 el renderer Canvas está deprecado).
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: COLORS.background,

  // pixelArt desactiva el suavizado de texturas. roundPixels lo ponemos explícito porque
  // en Phaser 4 su valor por defecto pasó a ser false.
  pixelArt: true,
  roundPixels: true,

  // Escalado: el canvas se queda en 480x270 y se amplía por CSS con un zoom (ver fitScale más abajo).
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: Phaser.Scale.MAX_ZOOM,
  },

  physics: {
    default: 'arcade',
    arcade: {
      // Gravedad global en 0: cada body que la necesita (el jugador) define la suya.
      // Así el NPC, el obstáculo y los props no caen sin tener que desactivarla uno por uno.
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },

  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    CharacterSelectScene,
    NameEntryScene,
    GameScene,
    GameOverScene,
    EndingScene,
    LeaderboardScene,
    DevMenuScene,
  ],
};

const game = new Phaser.Game(config);

// Tabla de tiempos: sesión anónima en segundo plano. No bloquea el arranque; si falla, el juego sigue igual.
Leaderboard.init();

// --- Escala ---
// Computador: zoom ENTERO (el mayor que cabe). Con un factor no entero (p. ej. 2.37x) unos pixeles salen más
// anchos que otros, y en una pantalla grande sobra espacio para un entero.
// Táctil: zoom NO entero que llena la pantalla manteniendo la proporción (lo mismo que haría Scale.FIT). En un
// celular el mayor entero suele ser 1 y el juego quedaría diminuto; aquí manda poder ver y tocar.
// ¿Por qué zoom y no cambiar a Scale.FIT? Phaser solo prepara el modo FIT al arrancar (boot); cambiarlo en vivo
// al pasar de teclado a táctil (laptop con pantalla táctil) no es confiable. Con Scale.NONE + zoom el resultado
// es idéntico (el canvas sigue en 480x270 y se estira por CSS, centrado con CENTER_BOTH) y basta un setZoom.
// En ambos casos el canvas lleva image-rendering: pixelated (index.html), así que nunca se ve borroso.
// En computador se reservan FRAME_PX por lado para el marco del canvas (index.html): en un monitor 1080p en pantalla
// completa queda x3 con marco (x4 mide justo 1920x1080 y el marco no cabría).
const FRAME_PX = 8;
const app = document.getElementById('app');

function fitScale() {
  const scale = game.scale;
  scale.getParentBounds();
  const { width, height } = scale.parentSize;
  if (!width || !height) return;
  const zoom = Device.isTouch
    ? Math.min(width / GAME_W, height / GAME_H)
    : Math.max(1, Math.floor(Math.min((width - 2 * FRAME_PX) / GAME_W, (height - 2 * FRAME_PX) / GAME_H)));
  if (zoom > 0 && Math.abs(zoom - scale.zoom) > 1e-4) scale.setZoom(zoom);
  else scale.refresh();
  // Sin marco en el celular cuando el juego ocupa toda la altura (o todo el ancho): ahí cada pixel cuenta.
  const fills = GAME_H * zoom >= height - 0.5 || GAME_W * zoom >= width - 0.5;
  app.classList.toggle('no-frame', Device.isTouch && fills);
}

// MAX_ZOOM solo se calcula al arrancar: con cada cambio de tamaño, de orientación, del área visible (teclado de
// pantalla, barras del navegador) o de modo, se recalcula.
window.addEventListener('resize', fitScale);
window.addEventListener('orientationchange', () => setTimeout(fitScale, 100)); // iOS informa el tamaño nuevo un poco después
window.visualViewport?.addEventListener('resize', fitScale);
Device.onChange(fitScale);
game.events.once('ready', fitScale);

// Pantalla completa (botón y tecla F), sobre #app. La F no cuenta en la comanda del nombre (es una letra).
Fullscreen.init(app, { isTyping: () => game.scene.isActive('NameEntry') });
Fullscreen.onChange(() => setTimeout(fitScale, 50)); // el tamaño nuevo llega un poco después del evento

// Controles táctiles (overlay HTML) y pausas del celular (vertical, segundo plano).
TouchControls.init();
Lifecycle.init(game);

// Útil para depurar desde la consola del navegador.
window.__game = game;
