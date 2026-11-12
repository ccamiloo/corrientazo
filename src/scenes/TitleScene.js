import * as Phaser from 'phaser';
import { GAME_W, MENU, UI, COLORS } from '../config/constants.js';
import { CHARACTERS } from '../data/characters.js';
import { Controls } from '../systems/Controls.js';
import { Music } from '../systems/Music.js';
import { pixelText, PanelText } from '../systems/pixelText.js';
import { menuBackground, menuCharacter } from '../systems/menuHelpers.js';
import { bindPrompt } from '../systems/prompts.js';
import { SaveGame } from '../systems/SaveGame.js';
import { formatTimeShort } from '../systems/PlayTimer.js';

// Botón de texto: en táctil la caja crece a 31 px de alto (≈ 44 px de CSS en un celular, buen tamaño para el
// dedo); con teclado y mouse queda como siempre.
function touchPad(panel, touch) {
  panel.padX = touch ? 8 : 6;
  panel.padY = touch ? 10 : 3;
  panel.setText(panel.label.text ?? '');
}

// Pantalla de título (docs/mockups/mockup_inicio_x3.png, a x3; aquí todo va en px del juego, 480x270).
// Preload → Title → CharacterSelect.
export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    this.controls = new Controls(this);
    Music.play(this, 'menus'); // la misma pista sigue en la selección sin cortarse

    // Fondo: la calle, desplazándose sola. Se mueve la cámara (todo lo demás está fijo a la pantalla) y
    // como no sigue a nadie, el fondo se actualiza a mano en update().
    this.bg = menuBackground(this);

    // Logo arriba, con un flotado de 1 px (y entera en ambos extremos; roundPixels evita medios pixeles).
    const logo = this.add.image(GAME_W / 2, 33, 'ui-logo').setOrigin(0.5, 0).setScrollFactor(0);
    this.tweens.add({ targets: logo, y: 32, duration: MENU.logoFloatMs / 2, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    pixelText(this, GAME_W / 2, 107, 'El único corrientazo que vale la pena es el del almuerzo', { origin: 0.5 }).setScrollFactor(0);

    // Botón JUGAR: spritesheet 88x29 (0 normal, 1 hover, 2 presionado).
    this.button = this.add.sprite(GAME_W / 2, 151, 'ui-button-jugar', 0).setOrigin(0.5, 0).setScrollFactor(0);
    this.button.setInteractive({ useHandCursor: true });
    this.button.on('pointerover', () => !this.leaving && this.button.setFrame(1));
    this.button.on('pointerout', () => !this.leaving && this.button.setFrame(0));
    this.button.on('pointerdown', () => this.play());

    // "Enter o clic para jugar" / "Toca para empezar" (prompts.js), al día si cambia el modo.
    bindPrompt(this, pixelText(this, GAME_W / 2, 191, '', { color: UI.lightYellow, origin: 0.5 }).setScrollFactor(0), 'titleStart');

    // En táctil, tocar en cualquier parte que no sea un botón empieza (y ese primer toque desbloquea el audio en
    // iOS: Phaser lo hace solo con el primer gesto). `over` = objetos interactivos bajo el dedo.
    this.input.on('pointerdown', (pointer, over) => {
      if (!over.length) this.play();
    });

    // Los personajes en fila sobre el andén, en idle.
    const spacing = 38;
    const firstX = GAME_W / 2 - ((CHARACTERS.length - 1) * spacing) / 2;
    CHARACTERS.forEach((c, i) => menuCharacter(this, c, firstX + i * spacing, MENU.groundY, 'idle'));

    // Botón "Tabla de tiempos" (solo lectura), arriba a la derecha donde el cielo está libre. Clic o tecla T.
    // La caja va con scrollFactor 0 también: la cámara de esta pantalla se mueve y el área de clic la seguiría.
    const board = new PanelText(this, GAME_W - 6, 6, '', { bg: COLORS.dialogBg, padX: 6, padY: 3, origin: [1, 0] });
    bindPrompt(this, board, 'titleBoard', {}, (touch) => touchPad(board, touch));
    board.box.setScrollFactor(0).setInteractive({ useHandCursor: true });
    board.box.on('pointerover', () => board.label.setColor(UI.yellow));
    board.box.on('pointerout', () => board.label.setColor(UI.white));
    board.box.on('pointerdown', () => this.openBoard());
    this.input.keyboard.on('keydown-T', () => this.openBoard());

    // Partida guardada (SaveGame): "Continuar" arriba a la izquierda, con el nivel y el tiempo. C o toque.
    this.save = SaveGame.load();
    if (this.save) {
      const level = `(nivel ${SaveGame.levelNumber(this.save.roomId)}, ${formatTimeShort(this.save.elapsedMs)})`;
      const cont = new PanelText(this, 6, 6, '', { bg: COLORS.dialogBg, padX: 6, padY: 3, origin: [0, 0] });
      bindPrompt(this, cont, 'titleContinue', { level }, (touch) => touchPad(cont, touch));
      cont.box.setScrollFactor(0).setInteractive({ useHandCursor: true });
      cont.box.on('pointerover', () => cont.label.setColor(UI.yellow));
      cont.box.on('pointerout', () => cont.label.setColor(UI.white));
      cont.box.on('pointerdown', () => this.continueGame());
      this.input.keyboard.on('keydown-C', () => this.continueGame());
    }

    this.leaving = false;
  }

  continueGame() {
    if (this.leaving || !this.save) return;
    this.leaving = true;
    SaveGame.continueGame(this, this.save);
  }

  openBoard() {
    if (this.leaving) return;
    this.leaving = true;
    this.scene.start('Leaderboard', { mode: 'view' });
  }

  // Muestra el botón presionado un instante y pasa a la selección.
  play() {
    if (this.leaving) return;
    this.leaving = true;
    this.button.setFrame(2);
    this.time.delayedCall(MENU.buttonPressMs, () => this.scene.start('CharacterSelect'));
  }

  update(time, delta) {
    if (this.controls.justDown('confirm')) this.play();
    // Fondo hacia la derecha: la cámara retrocede, así el paisaje avanza hacia la derecha de la pantalla.
    this.cameras.main.scrollX -= (MENU.scrollSpeed * delta) / 1000;
    this.bg.update();
  }
}
