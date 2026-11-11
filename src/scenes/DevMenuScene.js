import * as Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, FONT } from '../config/constants.js';
import { ROOMS } from '../data/rooms/index.js';
import { currentCharacter } from '../data/characters.js';
import { Controls } from '../systems/Controls.js';
import { startNewGame } from '../systems/startGame.js';
import { Music } from '../systems/Music.js';

// TEMPORAL (solo desarrollo): menú para entrar directo a cualquier sala registrada en ROOMS.
// Se abre con F3 desde la selección de personaje o desde el juego, si DEV.menu está en true.
// Para quitarlo al final: DEV.menu = false (o borrar esta escena y sus dos accesos).

// Nombre legible de cada sala; las que no estén aquí se muestran por su id.
const LABELS = {
  house: 'Nivel 1: la casa',
  street_1: 'Nivel 2: la calle (sala 1)',
  testRoom: 'Sala de prueba',
};

// Teclas propias del menú (no usa CONTROLS: aquí arriba/abajo navegan en vez de saltar/interactuar).
const MENU_KEYS = {
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  confirm: ['ENTER', 'SPACE'],
  back: ['ESC', 'F3'],
};

export class DevMenuScene extends Phaser.Scene {
  constructor() {
    super('DevMenu');
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.background);
    this.controls = new Controls(this, MENU_KEYS);
    Music.play(this, 'menus'); // si venimos de la selección, sigue la misma pista sin cortarse
    this.rooms = Object.keys(ROOMS);
    this.index = 0;

    this.add
      .text(GAME_W / 2, 36, 'Menú de desarrollo', { fontFamily: FONT, fontSize: '16px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);

    const character = currentCharacter(this.registry);
    this.add
      .text(GAME_W / 2, 58, `Personaje: ${character.name}`, { fontFamily: FONT, fontSize: '10px', color: COLORS.textDim })
      .setOrigin(0.5);

    this.items = this.rooms.map((id, i) =>
      this.add
        .text(GAME_W / 2, 96 + i * 18, LABELS[id] ?? id, { fontFamily: FONT, fontSize: '10px', color: COLORS.textDim })
        .setOrigin(0.5),
    );

    this.add
      .text(GAME_W / 2, GAME_H - 20, '↑ ↓ elegir   ·   Enter entrar   ·   Esc volver', {
        fontFamily: FONT,
        fontSize: '8px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5);

    this.refresh();
  }

  refresh() {
    this.items.forEach((t, i) => {
      const selected = i === this.index;
      t.setColor(selected ? COLORS.text : COLORS.textDim);
      t.setText(`${selected ? '> ' : '  '}${LABELS[this.rooms[i]] ?? this.rooms[i]}${selected ? ' <' : '  '}`);
    });
  }

  update() {
    // Cada acción se consulta una vez por frame (regla de Controls).
    const up = this.controls.justDown('up');
    const down = this.controls.justDown('down');
    const confirm = this.controls.justDown('confirm');
    const back = this.controls.justDown('back');
    const n = this.rooms.length;

    if (up) this.index = (this.index - 1 + n) % n;
    if (down) this.index = (this.index + 1) % n;
    if (up || down) this.refresh();

    if (confirm) startNewGame(this, this.rooms[this.index]);
    else if (back) this.scene.start('CharacterSelect');
  }
}
