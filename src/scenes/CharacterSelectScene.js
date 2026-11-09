import * as Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, FONT } from '../config/constants.js';
import { CHARACTERS } from '../data/characters.js';
import { START_ROOM } from '../data/rooms/index.js';
import { PlayTimer } from '../systems/PlayTimer.js';
import { RoomFlags } from '../systems/RoomFlags.js';
import { Controls } from '../systems/Controls.js';

export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.controls = new Controls(this);
    this.index = this.registry.get('characterIndex') ?? 0;

    this.add
      .text(GAME_W / 2, 52, 'CORRIENTAZO', { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: COLORS.danger })
      .setOrigin(0.5);
    this.add
      .text(GAME_W / 2, 84, 'Elige tu personaje', { fontFamily: FONT, fontSize: '10px', color: COLORS.text })
      .setOrigin(0.5);

    // Tres personajes centrados; el cursor es un marco que se mueve al seleccionado.
    const spacing = 80;
    const baseY = 160;
    this.slots = CHARACTERS.map((c, i) => {
      const x = GAME_W / 2 + (i - 1) * spacing;
      // Con spritesheet hay que pedir un frame (0 = idle); sin frame Phaser mostraría la hoja entera.
      const sprite = this.add.image(x, baseY, c.texture, c.sheet ? 0 : undefined).setScale(2);
      const label = this.add
        .text(x, baseY + 48, c.name, { fontFamily: FONT, fontSize: '10px', color: COLORS.textDim })
        .setOrigin(0.5);
      return { x, sprite, label };
    });
    // Marco un poco más ancho que el sprite más ancho (Moisés x2 = 48 px) para que no le pise los bordes.
    const cursorW = Math.max(...this.slots.map((s) => s.sprite.displayWidth)) + 8;
    this.cursor = this.add.rectangle(0, baseY, cursorW, 80).setStrokeStyle(1, 0xffffff).setFillStyle();

    this.add
      .text(GAME_W / 2, GAME_H - 20, '← → para elegir   ·   Enter para confirmar', {
        fontFamily: FONT,
        fontSize: '8px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);

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
    if (this.controls.justDown('confirm')) {
      this.registry.set('characterIndex', this.index);
      // Partida nueva: el timer global arranca en 0 y los flags de las salas se limpian.
      PlayTimer.start(this.registry);
      RoomFlags.reset(this.registry);
      this.scene.start('Game', { roomId: START_ROOM });
    }
  }
}
