import * as Phaser from 'phaser';
import { DEPTH, INTERACT_RADIUS } from '../config/constants.js';

// Objeto con el que se interactúa (tecla abajo). Muestra un indicador con flecha encima cuando el jugador está cerca.
// `onInteract` lo define quien lo crea (la escena), así esta clase no sabe nada de diálogos ni flags.
// `canInteract` (opcional): función que dice si hoy se puede interactuar; si devuelve false, el objeto
// no muestra el indicador ni responde (p. ej. la abuela antes de hablar con papá).
// Es un Sprite (no Image) para que los NPCs y props puedan animarse; sin animación se comporta igual.
export class Interactable extends Phaser.GameObjects.Sprite {
  // `frame`: obligatorio con spritesheets (sin frame, Phaser mostraría la hoja entera).
  // `standY` (opcional): y de los pies del jugador desde donde se alcanza, si no es la base del objeto (p. ej. el
  // taco del mercado, colgado en la pared y alcanzable desde lo alto de las cajas).
  constructor(scene, x, y, textureKey, { onInteract, radius = INTERACT_RADIUS, canInteract = () => true, frame, standY } = {}) {
    super(scene, x, y, textureKey, frame);
    scene.add.existing(this);
    this.setOrigin(0.5, 1); // origen en los pies: x,y = punto de apoyo en el suelo
    this.setDepth(DEPTH.props);

    this.onInteract = onInteract;
    this.radius = radius;
    this.canInteract = canInteract;
    this.standY = standY ?? y;

    // Indicador: textura generada en PreloadScene (cuadrito con flecha hacia abajo), 10 px por encima del
    // borde superior VISIBLE del sprite. Algunos props traen filas transparentes (p. ej. el TV tiene 12 abajo
    // para apoyarse en el mueble del fondo), así que no basta con el alto de la textura.
    // Se guarda en un array para que el tween y setPromptVisible sigan funcionando si se le suman piezas.
    const py = y - this.visibleHeight() - 10;
    this.prompt = [scene.add.image(x, py, 'prompt-down').setDepth(DEPTH.prompt)];
    this.setPromptVisible(false);

    // Pequeño rebote para que se note; y es entero en ambos extremos para no generar temblor sub-pixel visible.
    scene.tweens.add({ targets: this.prompt, y: py - 2, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  // Alto desde el pie del sprite hasta su primera fila con algún pixel opaco (frame actual).
  // Con origen abajo al centro, el borde superior visible queda en y - visibleHeight().
  // Se lee el frame recortado de su imagen fuente (cutX/cutY), así sirve igual para spritesheets.
  visibleHeight() {
    const f = this.frame;
    const w = f.cutWidth;
    const h = f.cutHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(f.source.image, f.cutX, f.cutY, w, h, 0, 0, w, h);
    const alpha = ctx.getImageData(0, 0, w, h).data;
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        if (alpha[(row * w + col) * 4 + 3] > 0) return h - row;
      }
    }
    return h;
  }

  // Distancia horizontal desde el jugador y misma "altura" aproximada (evita activar desde una plataforma de arriba).
  isInRange(player) {
    if (!this.canInteract()) return false;
    const dx = Math.abs(player.x - this.x);
    const dy = Math.abs(player.body.bottom - this.standY);
    return dx <= this.radius && dy <= 8;
  }

  setPromptVisible(visible) {
    this.prompt.forEach((o) => o.setVisible(visible));
  }

  interact() {
    this.onInteract?.(this);
  }
}
