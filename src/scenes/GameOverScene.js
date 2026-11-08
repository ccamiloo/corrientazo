import * as Phaser from 'phaser';
import { GAME_W, GAME_H, COLORS, FONT } from '../config/constants.js';
import { PlayTimer } from '../systems/PlayTimer.js';

// Tips de ejemplo; más adelante cada muerte podría mostrar el tip del peligro que la causó.
const TIPS = ['Nunca toques un cable suelto: aléjate y llama a un técnico.'];

// Margen antes de aceptar teclas, para que la tecla que el jugador venía presionando
// (por ejemplo, la flecha con la que chocó) no salte la pantalla al instante.
const INPUT_DELAY_MS = 400;

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.roomId = data.roomId;
  }

  create() {
    // El timer ya lo pausó GameScene al morir; aquí no corre porque solo GameScene llama a tick().
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.add
      .text(GAME_W / 2, GAME_H / 2 - 24, '¡CORRIENTAZO!', {
        fontFamily: FONT,
        fontSize: '32px',
        fontStyle: 'bold',
        color: COLORS.danger,
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_W / 2, GAME_H / 2 + 14, Phaser.Utils.Array.GetRandom(TIPS), {
        fontFamily: FONT,
        fontSize: '10px',
        color: COLORS.text,
        align: 'center',
        wordWrap: { width: GAME_W - 80 },
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(GAME_W / 2, GAME_H - 24, 'Presiona cualquier tecla para reintentar', {
        fontFamily: FONT,
        fontSize: '8px',
        color: COLORS.textDim,
      })
      .setOrigin(0.5)
      .setAlpha(0);

    this.time.delayedCall(INPUT_DELAY_MS, () => {
      hint.setAlpha(1);
      this.input.keyboard.once('keydown', () => {
        PlayTimer.resume(this.registry);
        this.scene.start('Game', { roomId: this.roomId });
      });
    });
  }
}
