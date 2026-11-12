import { GAME_W, DEPTH, COLORS, TILE } from '../config/constants.js';
import { PanelText } from './pixelText.js';
import { prompt } from './prompts.js';
import { Device } from './Device.js';

// Avisos de tutorial que aparecen UNA sola vez, en el momento justo.
// Cada aviso (datos de la sala):
//   { id, text, trigger: 'start' | zone: {x,y,w,h} (tiles), requires?: flag, doneWhen: 'moved'|'jumped'|'talked' }
// - Aparece al entrar a la sala (trigger 'start') o cuando los pies del jugador pisan la zona, y solo si
//   el flag `requires` (si lo hay) ya está activo.
// - Se oculta cuando el jugador hace la acción que enseña (doneWhen).
// - "Una sola vez": al mostrarse se marca el flag `hint_<id>` de la sala, que sobrevive a reinicios.
export class TutorialHints {
  constructor(scene, hints) {
    this.scene = scene;
    this.hints = hints ?? [];
    this.active = null;

    this.text = new PanelText(scene, GAME_W / 2, 20, '', { bg: COLORS.dialogBg, padX: 6, padY: 3, origin: [0.5, 0] })
      .setDepth(DEPTH.ui)
      .setAlpha(0);

    // Si el modo cambia (teclado ⇄ táctil) con un aviso en pantalla, se reescribe.
    Device.onChangeWhile(scene, () => this.active && this.text.setText(this.textOf(this.active)));
  }

  textOf(hint) {
    return hint.prompt ? prompt(hint.prompt) : hint.text;
  }

  update() {
    const { scene } = this;
    const player = scene.player;
    // Con una pantalla encima (los controles al empezar) los avisos esperan: aparecen al cerrarla.
    if (scene.overlayOpen) return;

    // ¿Terminó el aviso activo?
    if (this.active && this.isDone(this.active)) this.hide();

    // ¿Corresponde mostrar uno nuevo? (reemplaza al activo si lo hubiera)
    for (const hint of this.hints) {
      if (hint === this.active || scene.flag(`hint_${hint.id}`)) continue;
      if (hint.requires && !scene.flag(hint.requires)) continue;
      const triggered = hint.trigger === 'start' || (hint.zone && this.inZone(player, hint.zone));
      if (triggered) this.show(hint);
    }
  }

  show(hint) {
    this.scene.setFlag(`hint_${hint.id}`, true);
    this.active = hint;
    // Posición del jugador al aparecer: 'moved' se mide desde aquí.
    this.startX = this.scene.player.x;
    this.text.setText(this.textOf(hint));
    this.scene.tweens.killTweensOf(this.text);
    this.scene.tweens.add({ targets: this.text, alpha: 1, duration: 200 });
  }

  hide() {
    this.active = null;
    this.scene.tweens.killTweensOf(this.text);
    this.scene.tweens.add({ targets: this.text, alpha: 0, duration: 300 });
  }

  isDone(hint) {
    const { player, dialog } = this.scene;
    switch (hint.doneWhen) {
      case 'moved':
        return Math.abs(player.x - this.startX) >= 2 * TILE;
      case 'jumped':
        return player.body.velocity.y < 0;
      case 'talked':
        return dialog.blocking;
      default:
        return false;
    }
  }

  // Zona en tiles; se compara con los pies del jugador (centro en X, borde inferior del body).
  inZone(player, zone) {
    const fx = player.x / TILE;
    const fy = (player.body.bottom - 1) / TILE;
    return fx >= zone.x && fx < zone.x + zone.w && fy >= zone.y && fy < zone.y + zone.h;
  }
}
