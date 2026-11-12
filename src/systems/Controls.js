import { CONTROLS } from '../config/constants.js';
import { TouchControls } from './TouchControls.js';

// Agrupa varias teclas por acción (p. ej. jump = Espacio, W, Flecha arriba) y les suma los botones táctiles,
// para que el resto del código pregunte por acciones y no por teclas ni dedos.
//
// Táctil (src/systems/TouchControls.js): left/right/jump mantenidos y las marcas de flanco de jump/interact.
// Las marcas táctiles solo cuentan mientras los botones se ven (los muestra GameScene), así un toque en otra
// pantalla nunca llega al juego.
//
// Atajos con nombre (equivalen a isDown/justDown): left, right, jumpHeld, jumpPressed(), interactPressed().
export class Controls {
  constructor(scene, map = CONTROLS) {
    this.actions = {};
    this.pressed = {};
    for (const [action, keyNames] of Object.entries(map)) {
      // addKey con captura activada: evita que el navegador reaccione (scroll con Espacio/flechas, ayuda con F1).
      this.actions[action] = keyNames.map((name) => {
        const key = scene.input.keyboard.addKey(name, true);
        // ¿Por qué un evento y no Phaser.Input.Keyboard.JustDown? JustDown se apoya en una marca
        // que el keyup borra: si la tecla baja y sube dentro del mismo frame (un toque muy rápido),
        // la pulsación se pierde. El evento 'down' siempre llega, y la marca dura hasta que se lea.
        key.on('down', () => {
          this.pressed[action] = true;
        });
        return key;
      });
      this.pressed[action] = false;
    }
  }

  // Estado táctil de una acción mantenida.
  touchDown(action) {
    if (!TouchControls.visible) return false;
    const s = TouchControls.state;
    if (action === 'left') return s.left;
    if (action === 'right') return s.right;
    if (action === 'jump') return s.jumpHeld;
    return false;
  }

  // true mientras alguna tecla (o el botón táctil) de la acción esté presionada.
  isDown(action) {
    return (this.actions[action]?.some((k) => k.isDown) ?? false) || this.touchDown(action);
  }

  // true una sola vez por pulsación: lee y "consume" la marca (de teclado y táctil).
  // Cada acción debe consultarse una sola vez por frame (y en cada frame, para no acumular pulsaciones viejas).
  justDown(action) {
    const was = this.pressed[action];
    this.pressed[action] = false;
    // La marca táctil se consume siempre (aunque los botones estén ocultos) para que no quede pendiente.
    const touched = (action === 'jump' || action === 'interact') && TouchControls.consume(action);
    return !!was || (touched && TouchControls.visible);
  }

  get left() {
    return this.isDown('left');
  }

  get right() {
    return this.isDown('right');
  }

  get jumpHeld() {
    return this.isDown('jump');
  }

  jumpPressed() {
    return this.justDown('jump');
  }

  interactPressed() {
    return this.justDown('interact');
  }
}
