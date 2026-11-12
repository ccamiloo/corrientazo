import { MENU, UI } from '../config/constants.js';
import { ParallaxBackground } from './ParallaxBackground.js';
import { animKey } from '../data/characters.js';

// Piezas compartidas por la pantalla de título y la selección de personaje.

// Fondo de la calle anclado para que el andén dibujado en la capa 'mid' quede en MENU.groundY.
export function menuBackground(scene) {
  return new ParallaxBackground(scene, 'street').anchorScreen(MENU.groundY, MENU.sidewalkRow);
}

// Sprite de un personaje parado con los pies en (x, y), fijo a la pantalla, con su animación `anim`.
// Los personajes sin spritesheet (placeholder) quedan como imagen fija.
export function menuCharacter(scene, character, x, y, anim = 'idle') {
  const sprite = scene.add
    .sprite(x, y, character.texture, character.sheet ? 0 : undefined)
    .setOrigin(0.5, 1)
    .setScrollFactor(0);
  playIfExists(sprite, character, anim);
  return sprite;
}

export function playIfExists(sprite, character, anim) {
  const key = animKey(character.texture, anim);
  if (sprite.scene.anims.exists(key)) sprite.play(key, true);
}

// Pedestal de ladrillo (selección de personaje), dibujado con Graphics: centrado en x, con su cara de arriba
// en `top` (ahí se paran los pies). Cara superior clara, dos hileras de ladrillos trabados y borde oscuro.
export function drawPedestal(scene, x, top) {
  const { w, h, color, mortar, light } = MENU.pedestal;
  const left = Math.round(x - w / 2);
  const g = scene.add.graphics().setScrollFactor(0);
  g.fillStyle(UI.outline).fillRect(left, top, w, h); // borde de 1 px (lo que queda del relleno de abajo)
  g.fillStyle(color).fillRect(left + 1, top + 1, w - 2, h - 2);
  g.fillStyle(light).fillRect(left + 1, top + 1, w - 2, 2); // cara de arriba, iluminada
  // Juntas: una línea horizontal a media altura del frente y juntas verticales trabadas por hilera.
  const frontTop = top + 3;
  const mid = frontTop + Math.floor((h - 4) / 2);
  g.fillStyle(mortar).fillRect(left + 1, frontTop, w - 2, 1).fillRect(left + 1, mid, w - 2, 1);
  for (let bx = left + 10; bx < left + w - 2; bx += 10) g.fillRect(bx, frontTop + 1, 1, mid - frontTop - 1);
  for (let bx = left + 5; bx < left + w - 2; bx += 10) g.fillRect(bx, mid + 1, 1, top + h - 2 - mid);
  return g;
}
