import { DEPTH, FONT } from '../config/constants.js';
import { PlayTimer, formatTime } from './PlayTimer.js';

const KEY = 'debug';

// Modo debug (F1): muestra el timer global, datos del jugador y las hitboxes de Arcade.
// El estado on/off vive en el registry para que se mantenga al morir y reaparecer.
export class DebugOverlay {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;

    this.text = scene.add
      .text(4, 4, '', {
        fontFamily: FONT,
        fontSize: '8px',
        color: '#7CFC9A',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: { x: 3, y: 2 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.debug);

    this.apply(this.enabled);
  }

  get enabled() {
    return !!this.scene.registry.get(KEY);
  }

  toggle() {
    this.scene.registry.set(KEY, !this.enabled);
    this.apply(this.enabled);
  }

  apply(on) {
    this.text.setVisible(on);

    // Arcade solo crea el gráfico de debug si arranca con debug: true.
    // Como arrancamos en false, lo creamos la primera vez que se activa.
    const world = this.scene.physics.world;
    if (on && !world.debugGraphic) {
      // Arcade lo crea con profundidad máxima; lo bajamos para que no tape la caja de diálogo.
      world.createDebugGraphic().setDepth(DEPTH.ui - 1);
    }
    world.drawDebug = on;
    if (world.debugGraphic) {
      world.debugGraphic.setVisible(on);
      if (!on) world.debugGraphic.clear();
    }
  }

  update() {
    if (!this.enabled) return;
    const p = this.player;
    const b = p.body;
    this.text.setText(
      [
        `t   ${formatTime(PlayTimer.elapsed(this.scene.registry))}`,
        `fps ${Math.round(this.scene.game.loop.actualFps)}`,
        `pos ${b.x.toFixed(1)}, ${b.y.toFixed(1)}`,
        `vel ${b.velocity.x.toFixed(0)}, ${b.velocity.y.toFixed(0)}`,
        `gnd ${p.grounded ? 'sí' : 'no'}`,
        `bg  ${this.scene.background?.name ?? '-'} (F2)`,
      ].join('\n'),
    );
  }
}
