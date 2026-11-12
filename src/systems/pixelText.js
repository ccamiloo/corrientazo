import * as Phaser from 'phaser';
import { UI } from '../config/constants.js';

// Texto con la fuente pixel del juego (BitmapText 'pixel', tamaño nativo 11, interlineado 12).
//
// Los glyphs de la fuente son blancos: el color se aplica con setTint (multiplica, así blanco × color = color).
// El contorno de 1 px son 4 copias del mismo texto teñidas de UI.outline y corridas 1 px arriba, abajo,
// izquierda y derecha, dibujadas detrás del texto. Todo vive en un Container, así que posición, profundidad,
// alpha, visibilidad y scrollFactor se manejan como un solo objeto.
//
// Escala: solo enteros (la fuente es pixel art; una escala fraccionaria deforma los glyphs). Con scale 2 el
// contorno también se corre 2 px, para que siga midiendo "1 pixel de la fuente".
const OFFSETS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

export class PixelText extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text = '', { color = UI.white, outline = true, scale = 1, maxWidth = 0, origin = [0, 0], align = 0 } = {}) {
    super(scene, x, y);
    scene.add.existing(this);
    if (!Number.isInteger(scale)) throw new Error(`pixelText: escala ${scale} no entera`);

    const [ox, oy] = Array.isArray(origin) ? origin : [origin, origin];
    const make = (dx, dy, tint) =>
      scene.make
        .bitmapText({ x: dx * scale, y: dy * scale, font: UI.font, text, size: UI.fontSize, align }, false)
        .setOrigin(ox, oy)
        .setScale(scale)
        .setTint(tint);

    this.outlines = outline ? OFFSETS.map(([dx, dy]) => make(dx, dy, UI.outline)) : [];
    this.main = make(0, 0, color);
    this.parts = [...this.outlines, this.main];
    this.add(this.parts);
    if (maxWidth) this.setMaxWidth(maxWidth);
  }

  get text() {
    return this.main.text;
  }

  // Ancho y alto del texto (sin el contorno), ya escalados. BitmapText.width/height ya incluyen la escala (son
  // los bounds "global"): multiplicar otra vez por scaleX daba el doble a escala 2.
  get textWidth() {
    return this.main.width;
  }

  get textHeight() {
    return this.main.height;
  }

  setText(value) {
    this.parts.forEach((p) => p.setText(value));
    return this;
  }

  setColor(color) {
    this.main.setTint(color);
    return this;
  }

  // Ajuste de línea (corta en espacios). `width` en px de pantalla, ya contando la escala.
  setMaxWidth(width) {
    this.parts.forEach((p) => p.setMaxWidth(width / p.scaleX));
    return this;
  }

  // Devuelve `value` con los saltos de línea que le pondría el ajuste actual. Sirve para la máquina de
  // escribir: se corta la línea completa una vez y se van mostrando trozos de ese texto ya cortado, así una
  // palabra que se está escribiendo no salta de renglón a mitad de camino.
  wrap(value) {
    const previous = this.main.text;
    this.main.setText(value);
    const wrapped = this.main.maxWidth > 0 ? this.main.getTextBounds().wrappedText : value;
    this.main.setText(previous);
    return wrapped;
  }
}

// Atajo: pixelText(scene, x, y, 'Hola', { color: UI.yellow, scale: 2, origin: 0.5 }).
export const pixelText = (scene, x, y, text, options) => new PixelText(scene, x, y, text, options);

// Texto sobre una caja oscura que se ajusta a su tamaño (avisos del tutorial, HUD, debug).
// `origin` ubica la CAJA respecto a (x, y): [0.5, 0] = centrada arriba, [1, 0] = esquina superior derecha.
// Fija a la pantalla (scrollFactor 0).
export class PanelText extends Phaser.GameObjects.Container {
  constructor(scene, x, y, text = '', { color = UI.white, bg, bgAlpha = 0.85, padX = 5, padY = 2, origin = [0, 0] } = {}) {
    super(scene, x, y);
    scene.add.existing(this);
    this.padX = padX;
    this.padY = padY;
    this.boxOrigin = origin;
    this.box = scene.add.rectangle(0, 0, 1, 1, bg, bgAlpha).setOrigin(0);
    this.label = new PixelText(scene, 0, 0, '', { color, outline: false });
    this.add([this.box, this.label]);
    this.setScrollFactor(0);
    this.setText(text);
  }

  setText(value) {
    this.label.setText(value);
    // La caja mide el texto más el relleno; se reubica para respetar el origen pedido.
    const w = Math.ceil(this.label.textWidth) + this.padX * 2;
    const h = Math.ceil(this.label.textHeight) + this.padY * 2;
    const left = -Math.round(w * this.boxOrigin[0]);
    const top = -Math.round(h * this.boxOrigin[1]);
    this.box.setPosition(left, top).setSize(w, h);
    this.label.setPosition(left + this.padX, top + this.padY);
    return this;
  }
}
