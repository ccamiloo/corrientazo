import * as Phaser from 'phaser';
import { TILE, PLAYER, COLORS, PARALLAX } from '../config/constants.js';
import { CHARACTERS } from '../data/characters.js';

// Carga de assets. Los fondos se cargan desde archivo; el resto del greybox se genera por código.
//
// Clave del diseño: el resto del juego solo conoce las *keys* de textura ('player-0', 'tile', 'hazard'...).
// Cuando llegue el arte, este preload() pasará a hacer this.load.image / this.load.spritesheet
// con esas mismas keys y nada más del código tendrá que cambiar.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    // Fondo con parallax (public/assets/backgrounds/). Si algún PNG falla al cargar avisamos y seguimos:
    // GameScene omite las capas que falten en vez de dibujar la textura de "missing".
    this.load.on('loaderror', (file) => console.warn(`[Preload] no se pudo cargar ${file.key} (${file.url})`));
    for (const layer of PARALLAX.layers) {
      this.load.image(layer.key, PARALLAX.basePath + layer.file);
    }
  }

  create() {
    // Graphics fuera de la lista de display (no se dibuja): solo lo usamos como "pincel".
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    const make = (key, w, h, draw) => {
      g.clear();
      draw(g, w, h);
      g.generateTexture(key, w, h);
    };

    // Borde de 1 px por DENTRO de la textura: el tamaño no cambia, así sigue coincidiendo con el hitbox.
    // Se dibuja al final para que quede encima de los detalles (franja, ojos).
    const outline = (gr, w, h) => {
      gr.lineStyle(1, COLORS.outline).strokeRect(0.5, 0.5, w - 1, h - 1);
    };

    // Jugadores: rectángulo de color con una franja más clara arriba (indica hacia dónde está la "cabeza")
    // y un ojo a la derecha, para que se note el flipX al girar.
    CHARACTERS.forEach((c) => {
      make(c.texture, PLAYER.width, PLAYER.height, (gr, w, h) => {
        gr.fillStyle(c.color).fillRect(0, 0, w, h);
        gr.fillStyle(0xffffff, 0.35).fillRect(0, 0, w, 4);
        gr.fillStyle(0x0b0d12).fillRect(w - 5, 8, 2, 3);
        outline(gr, w, h);
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
      outline(gr, w, h);
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

    // Indicador de interacción: cuadrito claro con una flecha hacia abajo (la tecla para interactuar).
    // La flecha va dibujada a mano en vez de con texto '↓' para que sea pixel art nítido a 8 px.
    make('prompt-down', 11, 11, (gr, w, h) => {
      gr.fillStyle(COLORS.prompt).fillRect(0, 0, w, h);
      gr.fillStyle(0x0b0d12)
        .fillRect(4, 2, 3, 4) // tallo
        .fillRect(2, 6, 7, 1) // punta, de ancha a angosta
        .fillRect(3, 7, 5, 1)
        .fillRect(4, 8, 3, 1)
        .fillRect(5, 9, 1, 1);
    });

    g.destroy();
    this.scene.start('CharacterSelect');
  }
}
