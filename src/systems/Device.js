// ¿Se está jugando con el dedo o con teclado? Lo consultan la escala, los controles táctiles y los textos de ayuda.
//
// Arranca en táctil si el puntero principal es "grueso" (dedo) o si el equipo tiene pantalla táctil. Después se
// ajusta solo: el primer toque pasa a táctil y la primera tecla vuelve a teclado (sirve para laptops con
// pantalla táctil, que pueden usarse de las dos formas). Cada cambio avisa a los suscritos con onChange.

const listeners = new Set();

function detectTouch() {
  try {
    if (window.matchMedia?.('(pointer: coarse)').matches) return true;
  } catch {
    // matchMedia raro o ausente: se decide con lo demás
  }
  return 'ontouchstart' in window || (navigator.maxTouchPoints ?? 0) > 0;
}

let touch = detectTouch();

function set(value) {
  if (touch === value) return;
  touch = value;
  for (const fn of [...listeners]) fn(touch);
}

// Un teclado virtual de celular también manda keydown mientras se escribe el nombre en el <input> de la comanda:
// esas teclas no cuentan como "pasar a teclado". Android además manda keyCode 229 / 'Unidentified' al escribir.
function isTypingInField(event) {
  const t = event.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return true;
  return event.keyCode === 229 || event.key === 'Unidentified' || event.isComposing;
}

// En captura (true) para enterarse antes que Phaser, y pasivos: solo se mira, no se cancela nada.
window.addEventListener('touchstart', () => set(true), { capture: true, passive: true });
window.addEventListener(
  'pointerdown',
  (e) => {
    if (e.pointerType === 'touch') set(true);
  },
  { capture: true, passive: true },
);
window.addEventListener(
  'keydown',
  (e) => {
    if (!isTypingInField(e)) set(false);
  },
  true,
);

export const Device = {
  get isTouch() {
    return touch;
  },

  // Suscribe `fn(isTouch)` a los cambios de modo. Devuelve la función para desuscribirse.
  onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  // Igual que onChange, pero se desuscribe solo cuando la escena se apaga (evita llamar a textos destruidos).
  onChangeWhile(scene, fn) {
    const off = Device.onChange(fn);
    scene.events.once('shutdown', off);
    scene.events.once('destroy', off);
    return off;
  },

  // ¿La pantalla está vertical? (con un celular en la mano, eso es "girar para jugar").
  get isPortrait() {
    return window.innerHeight > window.innerWidth;
  },
};
