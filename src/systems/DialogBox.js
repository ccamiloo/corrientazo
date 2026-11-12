import { GAME_W, GAME_H, DEPTH, COLORS, UI, DIALOG } from '../config/constants.js';
import { genderize, currentCharacter } from '../data/characters.js';
import { pixelText } from './pixelText.js';

// Caja de diálogo fija a la cámara, en la parte inferior de la pantalla.
// Uso: open(lines, onClose, hooks) → advance() con cada pulsación de interactuar → al pasar la última
// línea se cierra y llama onClose.
//
// Máquina de escribir: cada línea aparece letra por letra (DIALOG.charsPerSecond). Si se interactúa
// mientras se escribe, la línea se completa de una vez; la siguiente pulsación pasa a la próxima línea.
// `hooks` (opcional) avisa a quien habla: onType(i) al empezar a escribir la línea i, onTyped(i) al
// terminarla (los NPCs animan "talk" entre ambos) y onClose() al cerrar la caja.
export class DialogBox {
  constructor(scene) {
    this.scene = scene;
    this.lines = [];
    this.index = 0;
    this.onClose = null;
    this.hooks = {};
    this.typing = null; // TimerEvent de la máquina de escribir mientras escribe

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

    // Hasta 3 renglones de 12 px. Sin contorno: va sobre la caja oscura.
    this.text = pixelText(scene, x + 10, y + 7, '', { outline: false, maxWidth: w - 20 });

    // Indicador en la esquina inferior derecha, dibujado (la fuente no trae '▼' ni '■'):
    // triangulito = hay más líneas; cuadradito = la próxima pulsación cierra. Solo aparece con la línea completa.
    const ix = x + w - 10;
    const iy = y + h - 7;
    this.more = scene.add.graphics().fillStyle(UI.dim).fillTriangle(ix - 3, iy - 2, ix + 3, iy - 2, ix, iy + 1);
    this.end = scene.add.graphics().fillStyle(UI.dim).fillRect(ix - 2, iy - 2, 4, 4);
    scene.tweens.add({ targets: [this.more, this.end], alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });

    this.parts = [this.bg, this.text, this.more, this.end];
    this.parts.forEach((o) => o.setScrollFactor(0).setDepth(DEPTH.ui).setVisible(false));
  }

  get isOpen() {
    return this.bg.visible;
  }

  get isTyping() {
    return this.typing !== null;
  }

  open(lines, onClose, hooks = {}) {
    // Marcadores de género ({mijo} → mijo/mija) según el personaje elegido. Se hace aquí, en el único
    // punto por donde pasan todos los diálogos, para que ningún nivel tenga que acordarse de llamarlo.
    const { gender } = currentCharacter(this.scene.registry);
    this.lines = lines.map((line) => genderize(line, gender));
    this.index = 0;
    this.onClose = onClose;
    this.hooks = hooks;
    this.bg.setVisible(true);
    this.text.setVisible(true);
    this.startLine();
  }

  advance() {
    if (this.isTyping) {
      this.finishLine();
      return;
    }
    this.index += 1;
    if (this.index >= this.lines.length) this.close();
    else this.startLine();
  }

  close() {
    this.stopTyping();
    this.parts.forEach((o) => o.setVisible(false));
    const cb = this.onClose;
    const hooks = this.hooks;
    this.onClose = null;
    this.hooks = {};
    hooks.onClose?.();
    cb?.();
  }

  // Escribe la línea actual letra por letra. El texto se corta en renglones UNA vez (wrap) y se muestran
  // prefijos de ese texto ya cortado, así las palabras no saltan de renglón mientras se escriben.
  startLine() {
    this.stopTyping();
    this.full = this.text.wrap(this.lines[this.index]);
    this.shown = 0;
    this.text.setText('');
    this.more.setVisible(false);
    this.end.setVisible(false);
    this.hooks.onType?.(this.index);
    // Reloj de la escena (sigue al game loop, también en las pruebas con __game.step).
    this.typing = this.scene.time.addEvent({
      delay: 1000 / DIALOG.charsPerSecond,
      loop: true,
      callback: () => {
        this.shown += 1;
        this.text.setText(this.full.slice(0, this.shown));
        if (this.shown >= this.full.length) this.finishLine();
      },
    });
  }

  finishLine() {
    this.stopTyping();
    this.text.setText(this.full);
    const last = this.index >= this.lines.length - 1;
    this.more.setVisible(!last);
    this.end.setVisible(last);
    this.hooks.onTyped?.(this.index);
  }

  stopTyping() {
    this.typing?.remove();
    this.typing = null;
  }
}
