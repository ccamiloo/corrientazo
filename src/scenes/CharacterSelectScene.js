import * as Phaser from 'phaser';
import { GAME_W, GAME_H, DEPTH, DEV, MENU, UI } from '../config/constants.js';
import { CHARACTERS } from '../data/characters.js';
import { Controls } from '../systems/Controls.js';
import { Music } from '../systems/Music.js';
import { pixelText } from '../systems/pixelText.js';
import { menuBackground, menuCharacter, playIfExists, drawPedestal } from '../systems/menuHelpers.js';

// Selección de personaje (docs/mockups/mockup_seleccion_x3.png, a x3; aquí en px del juego).
export class CharacterSelectScene extends Phaser.Scene {
  constructor() {
    super('CharacterSelect');
  }

  create() {
    this.controls = new Controls(this);
    Music.play(this, 'menus');
    this.index = this.registry.get('characterIndex') ?? 0;

    // La misma calle, quieta y oscurecida con un overlay azulado (atardecer). El overlay va entre el fondo
    // (depth -100..-97) y todo lo demás.
    menuBackground(this);
    this.add
      .rectangle(0, 0, GAME_W, GAME_H, MENU.duskColor, MENU.duskAlpha)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.background + 10);

    pixelText(this, GAME_W / 2, 48, 'Escoge tu personaje', { color: UI.yellow, scale: 2, origin: 0.5 }).setScrollFactor(0);

    // Cinco pedestales en fila, 86 px entre centros (como el mockup). Pies sobre la cara de arriba del pedestal.
    const spacing = 86;
    const feetY = 190;
    const firstX = GAME_W / 2 - ((CHARACTERS.length - 1) * spacing) / 2;
    this.slots = CHARACTERS.map((c, i) => {
      const x = firstX + i * spacing;
      drawPedestal(this, x, feetY);
      const sprite = menuCharacter(this, c, x, feetY, 'idle');
      const label = pixelText(this, x, 214, c.name, { origin: 0.5 }).setScrollFactor(0);
      return { x, sprite, label, character: c };
    });

    // Flecha sobre el seleccionado: 2 frames que se alternan para que "rebote".
    this.arrow = this.add.sprite(0, 138, 'ui-arrow', 0).setOrigin(0.5, 0).setScrollFactor(0);
    if (this.anims.exists('ui-arrow-bounce')) this.arrow.play('ui-arrow-bounce');

    // Sin '·' de separador: la fuente no lo trae.
    pixelText(this, GAME_W / 2, 243, '← → para escoger     Enter para jugar', { origin: 0.5 }).setScrollFactor(0);

    // TEMPORAL (desarrollo): acceso al menú de salas.
    if (DEV.menu) {
      pixelText(this, GAME_W / 2, 261, 'F3: menú de desarrollo', { color: UI.dim, origin: 0.5 }).setScrollFactor(0);
    }

    this.refresh();
  }

  // Seleccionado: nombre amarillo, camina en el sitio y lleva la flecha. Los demás: blanco e idle.
  refresh() {
    this.slots.forEach((s, i) => {
      const selected = i === this.index;
      s.label.setColor(selected ? UI.yellow : UI.white);
      playIfExists(s.sprite, s.character, selected ? 'walk' : 'idle');
    });
    this.arrow.x = this.slots[this.index].x;
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
      // Antes del primer nivel, el nombre para la tabla de tiempos (NameEntry arranca la partida).
      this.scene.start('NameEntry');
    } else if (devMenu && DEV.menu) {
      // El menú entra con el personaje que esté marcado en este momento.
      this.registry.set('characterIndex', this.index);
      this.scene.start('DevMenu');
    }
  }
}
