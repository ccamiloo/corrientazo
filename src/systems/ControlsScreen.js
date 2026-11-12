import { GAME_W, GAME_H, DEPTH, COLORS, UI } from '../config/constants.js';
import { pixelText } from './pixelText.js';
import { prompt } from './prompts.js';
import { Device } from './Device.js';
import { PlayTimer } from './PlayTimer.js';
import { TouchControls } from './TouchControls.js';

const INPUT_DELAY_MS = 400; // antes de aceptar la tecla/toque que la cierra (la de Enter de la comanda no la salta)

// Pantalla de controles encima del juego (inicio de la casa). Muestra las teclas, o los botones táctiles con su
// dibujo real, según el modo; si el modo cambia mientras está abierta, se redibuja.
// Mientras está abierta: jugador congelado, timer en pausa, sin botones táctiles (scene.overlayOpen).
// Se cierra con cualquier tecla o toque y llama onClose.
export function showControlsScreen(scene, onClose) {
  scene.overlayOpen = true;
  scene.freeze();
  const timerWasRunning = PlayTimer.isRunning(scene.registry);
  PlayTimer.pause(scene.registry);

  const layer = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH.ui + 5);
  const px = 80;
  const py = 40;
  const pw = GAME_W - 2 * px;
  const ph = 186;
  layer.add(scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55).setOrigin(0));
  layer.add(scene.add.rectangle(px, py, pw, ph, COLORS.dialogBg, 0.97).setOrigin(0).setStrokeStyle(1, COLORS.dialogBorder));
  layer.add(pixelText(scene, GAME_W / 2, py + 12, 'Controles', { color: UI.yellow, scale: 2, origin: [0.5, 0] }));

  let rows = null;
  const footer = pixelText(scene, GAME_W / 2, py + ph - 20, '', { color: UI.lightYellow, origin: [0.5, 0] });
  layer.add(footer);
  scene.tweens.add({ targets: footer, alpha: 0.35, duration: 500, yoyo: true, repeat: -1 });

  // Una fila: a la izquierda las teclas (texto) o los botones (frames de touch_buttons), a la derecha qué hacen.
  const build = () => {
    rows?.destroy();
    rows = scene.add.container(0, 0);
    layer.add(rows);
    const touch = Device.isTouch;
    const data = touch
      ? [
          { frames: [0, 2], text: 'Moverte' },
          { frames: [4], text: 'Saltar (mantén para saltar más alto)' },
          { frames: [6], text: 'Hablar y usar las cosas' },
        ]
      : [
          { keys: '← →  o  A D', text: 'Moverte' },
          { keys: 'Espacio, W o ↑', text: 'Saltar (mantén para saltar más alto)' },
          { keys: '↓ o S', text: 'Hablar y usar las cosas' },
        ];
    const colX = px + 112; // inicio de la descripción
    data.forEach((row, i) => {
      const cy = py + 62 + i * 36; // centro vertical de la fila
      if (row.frames) {
        row.frames.forEach((f, k) => {
          const right = colX - 12 - (row.frames.length - 1 - k) * 36;
          rows.add(scene.add.image(right, cy, 'touch-buttons', f).setOrigin(1, 0.5));
        });
      } else {
        rows.add(pixelText(scene, colX - 12, cy - 6, row.keys, { color: UI.yellow, origin: [1, 0] }));
      }
      rows.add(pixelText(scene, colX, cy - 6, row.text, { maxWidth: px + pw - colX - 10 }));
    });
    footer.setText(prompt('controlsStart'));
  };
  build();
  const offMode = Device.onChangeWhile(scene, build);

  const acceptAt = scene.time.now + INPUT_DELAY_MS;
  let closed = false;
  const close = () => {
    if (closed || scene.time.now < acceptAt) return;
    closed = true;
    offMode();
    scene.input.keyboard.off('keydown', close);
    scene.input.off('pointerdown', close);
    layer.destroy();
    // La tecla o el toque que cerró la pantalla no debe hacer saltar ni interactuar al jugador.
    for (const k of Object.keys(scene.controls.pressed)) scene.controls.pressed[k] = false;
    TouchControls.releaseAll();
    scene.tapped = false;
    scene.overlayOpen = false;
    // Se descongela al FINAL de este paso: Player.update de este mismo paso lee la tecla (si llegó como 'down')
    // estando todavía congelado, así que la consume sin saltar.
    scene.events.once('postupdate', () => scene.unfreeze());
    if (timerWasRunning) PlayTimer.resume(scene.registry);
    onClose?.();
  };
  scene.input.keyboard.on('keydown', close);
  scene.input.on('pointerdown', close);
}
