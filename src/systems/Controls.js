import { CONTROLS } from '../config/constants.js';

// Agrupa varias teclas por acción (p. ej. jump = Espacio, W, Flecha arriba)
// para que el resto del código pregunte por acciones y no por teclas concretas.
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

  // true mientras alguna tecla de la acción esté presionada.
  isDown(action) {
    return this.actions[action].some((k) => k.isDown);
  }

  // true una sola vez por pulsación: lee y "consume" la marca.
  // Cada acción debe consultarse una sola vez por frame (y en cada frame, para no acumular pulsaciones viejas).
  justDown(action) {
    const was = this.pressed[action];
    this.pressed[action] = false;
    return was;
  }
}
