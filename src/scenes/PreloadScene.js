import * as Phaser from 'phaser';
import { TILE, PLAYER, COLORS } from '../config/constants.js';
import { CHARACTERS } from '../data/characters.js';

// Carga de assets. En el greybox no hay archivos: generamos texturas por código.
//
// Clave del diseño: el resto del juego solo conoce las *keys* de textura ('player-0', 'tile', 'hazard'...).
// Cuando llegue el arte, este preload() pasará a hacer this.load.image / this.load.spritesheet
// con esas mismas keys y nada más del código tendrá que cambiar.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  create() {
    // Graphics fuera de la lista de display (no se dibuja): solo lo usamos como "pincel".
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    const make = (key, w, h, draw) => {
      g.clear();
      draw(g, w, h);
      g.generateTexture(key, w, h);
    };

    // Jugadores: rectángulo de color con una franja más clara arriba (indica hacia dónde está la "cabeza")
    // y un ojo a la derecha, para que se note el flipX al girar.
    CHARACTERS.forEach((c) => {
      make(c.texture, PLAYER.width, PLAYER.height, (gr, w, h) => {
        gr.fillStyle(c.color).fillRect(0, 0, w, h);
        gr.fillStyle(0xffffff, 0.35).fillRect(0, 0, w, 4);
        gr.fillStyle(0x0b0d12).fillRect(w - 5, 8, 2, 3);
      });
    });

    // Tile sólido con borde superior/izquierdo más claro para leer la grilla.
    make('tile', TILE, TILE, (gr, w, h) => {
      gr.fillStyle(COLORS.tile).fillRect(0, 0, w, h);
      gr.fillStyle(COLORS.tileEdge).fillRect(0, 0, w, 1).fillRect(0, 0, 1, h);
    });

    make('npc', 16, 28, (gr, w, h) => {
      gr.fillStyle(COLORS.npc).fillRect(0, 0, w, h);
      gr.fillStyle(0x0b0d12).fillRect(4, 7, 2, 3).fillRect(10, 7, 2, 3);
    });

    make('hazard', 16, 16, (gr, w, h) => {
      gr.fillStyle(COLORS.hazard).fillRect(0, 0, w, h);
      // Rayo simple en negro para que se lea como "peligro eléctrico".
      gr.fillStyle(0x0b0d12).fillRect(8, 2, 2, 6).fillRect(6, 7, 4, 2).fillRect(6, 8, 2, 6);
    });

    make('phone', 12, 18, (gr, w, h) => {
      gr.fillStyle(COLORS.phone).fillRect(0, 0, w, h);
      gr.fillStyle(COLORS.phoneAccent).fillRect(2, 2, w - 4, 4);
      gr.fillStyle(0x0b0d12).fillRect(2, 8, 2, 2).fillRect(5, 8, 2, 2).fillRect(8, 8, 2, 2);
      gr.fillStyle(0x0b0d12).fillRect(2, 12, 2, 2).fillRect(5, 12, 2, 2).fillRect(8, 12, 2, 2);
    });

    make('prompt-e', 11, 11, (gr, w, h) => {
      gr.fillStyle(COLORS.prompt).fillRect(0, 0, w, h);
    });

    g.destroy();
    this.scene.start('CharacterSelect');
  }
}
