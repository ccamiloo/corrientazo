import { GAME_W, GAME_H, DEPTH, COLORS, FONT } from '../config/constants.js';

// Caja de diálogo fija a la cámara, en la parte inferior de la pantalla.
// Uso: open(lines, onClose) → advance() con cada E → al pasar la última línea se cierra y llama onClose.
export class DialogBox {
  constructor(scene) {
    this.scene = scene;
    this.lines = [];
    this.index = 0;
    this.onClose = null;

    // Ocupa los últimos 56 px de la pantalla. Ojo al diseñar salas: si el suelo más bajo tiene
    // menos de 4 tiles de grosor, al estar en el fondo de la sala el jugador queda detrás de la caja.
    const margin = 6;
    const h = 50;
    const x = margin;
    const y = GAME_H - h - margin;
    const w = GAME_W - margin * 2;

    // setScrollFactor(0): queda pegada a la pantalla aunque la cámara se mueva.
    this.bg = scene.add
      .rectangle(x, y, w, h, COLORS.dialogBg, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, COLORS.dialogBorder);

    this.text = scene.add.text(x + 10, y + 8, '', {
      fontFamily: FONT,
      fontSize: '10px',
      color: COLORS.text,
      lineSpacing: 3,
      wordWrap: { width: w - 20, useAdvancedWrap: true },
    });

    // Indicador de "hay más": parpadea en la esquina inferior derecha.
    this.arrow = scene.add
      .text(x + w - 10, y + h - 6, '▼', { fontFamily: FONT, fontSize: '8px', color: COLORS.textDim })
      .setOrigin(1, 1);
    scene.tweens.add({ targets: this.arrow, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });

    this.parts = [this.bg, this.text, this.arrow];
    this.parts.forEach((o) => o.setScrollFactor(0).setDepth(DEPTH.ui).setVisible(false));
  }

  get isOpen() {
    return this.bg.visible;
  }

  open(lines, onClose) {
    this.lines = lines;
    this.index = 0;
    this.onClose = onClose;
    this.parts.forEach((o) => o.setVisible(true));
    this.render();
  }

  advance() {
    this.index += 1;
    if (this.index >= this.lines.length) {
      this.close();
    } else {
      this.render();
    }
  }

  close() {
    this.parts.forEach((o) => o.setVisible(false));
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  render() {
    this.text.setText(this.lines[this.index]);
    // En la última línea el indicador cambia a "■" para señalar que E cierra.
    this.arrow.setText(this.index < this.lines.length - 1 ? '▼' : '■');
  }
}
