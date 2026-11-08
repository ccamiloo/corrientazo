import * as Phaser from 'phaser';

// Primera escena. Hoy solo arranca Preload; aquí iría la carga mínima para una barra de progreso
// (logo, fuente de la barra) cuando haya assets reales.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Preload');
  }
}
