import * as Phaser from 'phaser';
import { DEPTH, INTERACT_RADIUS } from '../config/constants.js';

// Objeto con el que se interactúa con E. Muestra un indicador "E" encima cuando el jugador está cerca.
// `onInteract` lo define quien lo crea (la escena), así esta clase no sabe nada de diálogos ni flags.
export class Interactable extends Phaser.GameObjects.Image {
  constructor(scene, x, y, textureKey, { onInteract, radius = INTERACT_RADIUS } = {}) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    this.setOrigin(0.5, 1); // origen en los pies: x,y = punto de apoyo en el suelo
    this.setDepth(DEPTH.props);

    this.onInteract = onInteract;
    this.radius = radius;

    // Indicador "E": un cuadrito generado en PreloadScene + la letra encima.
    const py = y - this.height - 10;
    this.promptBg = scene.add.image(x, py, 'prompt-e').setDepth(DEPTH.prompt);
    this.promptText = scene.add
      .text(x, py, 'E', { fontFamily: 'monospace', fontSize: '8px', color: '#0b0d12', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(DEPTH.prompt + 1);
    this.prompt = [this.promptBg, this.promptText];
    this.setPromptVisible(false);

    // Pequeño rebote para que se note; y es entero en ambos extremos para no generar temblor sub-pixel visible.
    scene.tweens.add({ targets: this.prompt, y: py - 2, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // Distancia horizontal desde el jugador y misma "altura" aproximada (evita activar desde una plataforma de arriba).
  isInRange(player) {
    const dx = Math.abs(player.x - this.x);
    const dy = Math.abs(player.body.bottom - this.y);
    return dx <= this.radius && dy <= 8;
  }

  setPromptVisible(visible) {
    this.prompt.forEach((o) => o.setVisible(visible));
  }

  interact() {
    this.onInteract?.(this);
  }
}
