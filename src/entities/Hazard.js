import * as Phaser from 'phaser';
import { DEPTH } from '../config/constants.js';

// Obstáculo peligroso que se mueve de lado a lado con un tween.
//
// ¿Por qué setDirectControl? Si un tween mueve el GameObject, Arcade necesita saber que el
// body sigue al objeto (y no al revés). Con directControl el body copia la posición del
// GameObject en cada step y calcula su velocidad a partir del desplazamiento, así que
// overlap/collider siguen funcionando. Sin gravedad e inmóvil para que nada lo empuje.
export class Hazard extends Phaser.Physics.Arcade.Image {
  constructor(scene, { x, y, w, h, range, duration }, textureKey = 'hazard') {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0, 1); // x,y = esquina inferior izquierda (apoyado en el suelo)
    this.setDisplaySize(w, h);
    this.setDepth(DEPTH.props);

    this.body.setAllowGravity(false);
    this.body.setImmovable(true);
    this.body.setDirectControl(true);
    // Hitbox 2 px más chico por lado: tocar "de rozón" no debería matar (se siente más justo).
    this.body.setSize(this.width - 4, this.height - 4);

    this.tween = scene.tweens.add({
      targets: this,
      x: x + range - w,
      duration,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  disable() {
    this.tween?.stop();
    // world.disable lo saca de la simulación por completo (incluido el dibujo de debug);
    // poner body.enable = false a mano lo dejaría dibujándose en modo F1.
    this.scene.physics.world.disable(this);
    this.setVisible(false);
    this.setActive(false);
  }
}
