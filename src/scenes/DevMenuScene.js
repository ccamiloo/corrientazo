import * as Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, UI } from '../config/constants.js';
import { pixelText } from '../systems/pixelText.js';
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
  park: 'Nivel 3: el parque',
  market: 'Nivel 4: el mercado',
  construction: 'Nivel 5: la obra',
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

    pixelText(this, GAME_W / 2, 36, 'Menú de desarrollo', { scale: 2, origin: 0.5 });

    const character = currentCharacter(this.registry);
    pixelText(this, GAME_W / 2, 60, `Personaje: ${character.name}`, { color: UI.dim, origin: 0.5 });

    this.items = this.rooms.map((id, i) =>
      pixelText(this, GAME_W / 2, 96 + i * 18, LABELS[id] ?? id, { color: UI.dim, origin: 0.5 }),
    );

    // Sin '·' de separador: la fuente no lo trae.
    pixelText(this, GAME_W / 2, GAME_H - 20, '↑ ↓ elegir     Enter entrar     Esc volver', { color: UI.dim, origin: 0.5 });

    this.refresh();
  }

  refresh() {
    this.items.forEach((t, i) => {
      const selected = i === this.index;
      t.setColor(selected ? UI.yellow : UI.dim);
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
