import { Device } from './Device.js';

// Pantalla completa, igual para computador y celular.
//
// Se pide sobre #app (no sobre el canvas) para que en pantalla completa se siga viendo el fondo de la página a los
// lados del juego, y porque ahí viven también los overlays HTML (controles táctiles, aviso de girar, input del nombre):
// lo que esté fuera del elemento en pantalla completa no se ve.
//
// Botón: touch_fullscreen.png (frame 0 entrar, 1 salir) a x3, arriba a la derecha. Se esconde si el navegador no
// tiene requestFullscreen (Safari de iPhone: ahí se usa "Agregar a inicio" con el manifest).
// Atajo: F, salvo escribiendo (un <input> enfocado, o la comanda del nombre, donde la F es una letra).

const IMG = 'assets/ui/touch/touch_fullscreen.png'; // 2 frames de 16x16
const SIZE = 48; // 16 a x3
const MARGIN = 24;

let app = null;
let button = null;
let exitedAt = -Infinity; // ms (performance.now) de la última salida de pantalla completa
const listeners = new Set();

export const Fullscreen = {
  get supported() {
    return !!document.documentElement.requestFullscreen;
  },

  get active() {
    return !!document.fullscreenElement;
  },

  // ¿Se acaba de salir de pantalla completa? Para no confundir el Esc del navegador con el Esc del juego.
  justExited(ms = 500) {
    return performance.now() - exitedAt < ms;
  },

  async toggle() {
    if (!Fullscreen.supported) return;
    try {
      if (Fullscreen.active) {
        await document.exitFullscreen();
        return;
      }
      await app.requestFullscreen({ navigationUI: 'hide' });
      if (Device.isTouch) {
        try {
          await screen.orientation?.lock?.('landscape');
        } catch {
          // Muchos navegadores no dejan bloquear la orientación: el overlay de "gira tu celular" cubre ese caso.
        }
      }
    } catch {
      // Sin permiso (p. ej. no vino de un gesto del usuario): se sigue jugando igual.
    }
  },

  // `fn()` corre al entrar o salir de pantalla completa (main.js recalcula la escala).
  onChange(fn) {
    listeners.add(fn);
  },

  // `isTyping()`: true si la escena actual usa las letras (la comanda del nombre). Lo da main.js.
  init(appElement, { isTyping = () => false } = {}) {
    app = appElement;
    document.addEventListener('fullscreenchange', () => {
      if (!Fullscreen.active) exitedAt = performance.now();
      paint();
      for (const fn of listeners) fn(Fullscreen.active);
    });

    if (Fullscreen.supported) {
      button = document.createElement('button');
      button.id = 'fullscreen-btn';
      button.type = 'button';
      button.title = 'Pantalla completa (F)';
      button.setAttribute('aria-label', 'Pantalla completa');
      app.append(button);
      paint();
      // pointerup y no click: en el celular el click llega tarde y algunos navegadores ya no lo cuentan como gesto.
      button.addEventListener('pointerup', (e) => {
        e.preventDefault();
        Fullscreen.toggle();
      });
      button.addEventListener('click', (e) => e.preventDefault());
    }

    window.addEventListener('keydown', (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.key !== 'f' && e.key !== 'F')) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (isTyping()) return;
      Fullscreen.toggle();
    });
  },
};

function paint() {
  if (button) button.style.backgroundPositionX = Fullscreen.active ? `${-SIZE}px` : '0';
}

// Estilos del botón (fuera de Phaser, como los demás overlays).
const style = document.createElement('style');
style.textContent = `
  #fullscreen-btn {
    position: absolute;
    top: calc(${MARGIN}px + env(safe-area-inset-top, 0px));
    right: calc(${MARGIN}px + env(safe-area-inset-right, 0px));
    width: ${SIZE}px;
    height: ${SIZE}px;
    padding: 0;
    border: 0;
    background: url(${IMG}) 0 0 / ${SIZE * 2}px ${SIZE}px no-repeat;
    image-rendering: pixelated;
    opacity: 0.6;
    cursor: pointer;
    z-index: 20;
    touch-action: none;
    transition: opacity 0.12s;
  }
  #fullscreen-btn:hover, #fullscreen-btn:focus-visible { opacity: 1; }
`;
document.head.append(style);
