import * as Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, FONT, DEV } from '../config/constants.js';
import { CHARACTERS } from '../data/characters.js';
import { START_ROOM } from '../data/rooms/index.js';
import { Controls } from '../systems/Controls.js';
import { startNewGame } from '../systems/startGame.js';
import { Music } from '../systems/Music.js';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.controls = new Controls(this);
    Music.play(this, 'menus');
    this.index = this.registry.get('characterIndex') ?? 0;

    this.add
      .text(GAME_W / 2, 52, 'CORRIENTAZO', { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: COLORS.danger })
      .setOrigin(0.5);
    this.add
      .text(GAME_W / 2, 84, 'Elige tu personaje', { fontFamily: FONT, fontSize: '10px', color: COLORS.text })
      .setOrigin(0.5);

    // Personajes en una fila centrada; el cursor es un marco que se mueve al seleccionado.
    // Cabe en 480 px: 5 sprites de 48 px (24 x2) con 88 px entre centros ocupan 4·88 + 54 ≈ 406 px
    // (54 = ancho aproximado de "Sebastián", la etiqueta más larga, a 10 px monospace).
    const spacing = 88;
    const baseY = 160;
    const firstX = GAME_W / 2 - ((CHARACTERS.length - 1) * spacing) / 2;
    this.slots = CHARACTERS.map((c, i) => {
      const x = firstX + i * spacing;
      // Con spritesheet hay que pedir un frame (0 = idle); sin frame Phaser mostraría la hoja entera.
      const sprite = this.add.image(x, baseY, c.texture, c.sheet ? 0 : undefined).setScale(2);
      const label = this.add
        .text(x, baseY + 48, c.name, { fontFamily: FONT, fontSize: '10px', color: COLORS.textDim })
        .setOrigin(0.5);
      return { x, sprite, label };
    });
    // Marco un poco más ancho que el sprite más ancho (24 px x2 = 48 px) para que no le pise los bordes.
    const cursorW = Math.max(...this.slots.map((s) => s.sprite.displayWidth)) + 8;
    this.cursor = this.add.rectangle(0, baseY, cursorW, 80).setStrokeStyle(1, 0xffffff).setFillStyle();

    this.add
      .text(GAME_W / 2, GAME_H - 20, '← → para elegir   ·   Enter para confirmar', {
        fontFamily: FONT,
        fontSize: '8px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);

    // TEMPORAL (desarrollo): acceso al menú de salas.
    if (DEV.menu) {
      this.add
        .text(GAME_W / 2, GAME_H - 8, 'F3: menú de desarrollo', { fontFamily: FONT, fontSize: '8px', color: COLORS.textDim })
        .setOrigin(0.5)
        .setAlpha(0.6);
    }

    this.refresh();
  }

  refresh() {
    this.slots.forEach((s, i) => {
      const selected = i === this.index;
      s.label.setColor(selected ? COLORS.text : COLORS.textDim);
      s.sprite.setAlpha(selected ? 1 : 0.5);
    });
    this.cursor.x = this.slots[this.index].x;
  }

  update() {
    const n = CHARACTERS.length;
    if (this.controls.justDown('left')) {
      this.index = (this.index - 1 + n) % n;
      this.refresh();
    }
    if (this.controls.justDown('right')) {
      this.index = (this.index + 1) % n;
      this.refresh();
    }
    const confirm = this.controls.justDown('confirm');
    const devMenu = this.controls.justDown('devMenu');
    if (confirm) {
      this.registry.set('characterIndex', this.index);
      startNewGame(this, START_ROOM);
    } else if (devMenu && DEV.menu) {
      // El menú entra con el personaje que esté marcado en este momento.
      this.registry.set('characterIndex', this.index);
      this.scene.start('DevMenu');
    }
  }
}
