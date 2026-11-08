import * as Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { CharacterSelectScene } from './scenes/CharacterSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

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

  // Escalado: el canvas se queda en 480x270 y se amplía por CSS con un zoom ENTERO.
  // Usamos Scale.NONE + zoom en vez de Scale.FIT porque FIT escala por cualquier factor
  // (p. ej. 2.37x) y con factores no enteros unos pixeles salen más anchos que otros.
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

  scene: [BootScene, PreloadScene, CharacterSelectScene, GameScene, GameOverScene],
};

const game = new Phaser.Game(config);

// MAX_ZOOM solo se calcula al arrancar. Al cambiar el tamaño de la ventana recalculamos
// el mayor zoom entero que cabe (getMaxZoom usa el tamaño actual del contenedor).
window.addEventListener('resize', () => {
  game.scale.getParentBounds();
  game.scale.setMaxZoom();
});

// Útil para depurar desde la consola del navegador.
window.__game = game;
