import { Device } from './Device.js';

// Controles táctiles: un overlay HTML encima del canvas, dentro de #app (no son objetos de Phaser, así no dependen de la escala
// del juego ni de la cámara, y se ubican con env(safe-area-inset-*) para esquivar el notch).
//
// Botones (touch_buttons.png, 8 frames de 32x32 a x2 = 64x64 px de CSS):
//   0 izquierda, 1 izq. presionado, 2 derecha, 3 der. presionado, 4 saltar, 5 saltar presionado,
//   6 interactuar, 7 interactuar presionado.
// Izquierda y derecha son UNA sola zona (d-pad): la dirección sale de la x del dedo en cada pointermove, así se
// puede deslizar de un botón al otro sin levantar el dedo.
//
// Estado que lee Controls (src/systems/Controls.js): left, right, jumpHeld (mantenido) y las marcas de flanco
// jump / interact (true desde que se tocan hasta que Controls las consume).
//
// Robustez: cada botón captura su puntero (setPointerCapture) y suelta con pointerup, pointercancel y
// lostpointercapture, así un botón nunca queda "pegado" (p. ej. si el sistema roba el toque con una notificación).
// Cada puntero se sigue por su pointerId: mantener derecha y saltar a la vez funciona (multitouch real).

const SHEET = 'assets/ui/touch/touch_buttons.png';
const SIZE = 64; // px de CSS (32 del arte a x2)
const GAP = 10; // px entre izquierda y derecha
const MARGIN = 14; // px desde el borde (más el safe-area)
const JUMP_RISE = 34; // px que saltar queda más arriba que interactuar (mockup)

const state = {
  left: false,
  right: false,
  jumpHeld: false,
  pressed: { jump: false, interact: false },
};

let root = null;
let wanted = false; // la escena de juego quiere los controles
let interactHint = false;
const dpadPointers = new Map(); // pointerId → 'left' | 'right'
const buttons = {};

const insetL = 'env(safe-area-inset-left, 0px)';
const insetR = 'env(safe-area-inset-right, 0px)';
const insetB = 'env(safe-area-inset-bottom, 0px)';

// Captura el puntero para seguir recibiendo sus eventos aunque el dedo salga del botón. Si el navegador no puede
// (puntero ya liberado), se sigue igual: pointerup/pointercancel llegan de todos modos al botón.
function capture(el, pointerId) {
  try {
    el.setPointerCapture(pointerId);
  } catch {
    // sin captura
  }
}

function sprite(el, frame) {
  el.style.backgroundPosition = `${-frame * SIZE}px 0`;
}

function makeButton(css) {
  const el = document.createElement('div');
  el.className = 'touch-btn';
  Object.assign(el.style, {
    position: 'absolute',
    width: `${SIZE}px`,
    height: `${SIZE}px`,
    backgroundImage: `url(${SHEET})`,
    backgroundSize: `${SIZE * 8}px ${SIZE}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
    opacity: '0.7',
    pointerEvents: 'none', // el que recibe el toque es la zona (d-pad) o el botón contenedor
    ...css,
  });
  return el;
}

function paint() {
  sprite(buttons.left, state.left ? 1 : 0);
  buttons.left.style.opacity = state.left ? '0.95' : '0.7';
  sprite(buttons.right, state.right ? 3 : 2);
  buttons.right.style.opacity = state.right ? '0.95' : '0.7';
  sprite(buttons.jump, state.jumpHeld ? 5 : 4);
  buttons.jump.style.opacity = state.jumpHeld ? '0.95' : '0.7';
  sprite(buttons.interact, buttons.interact.dataset.down === '1' ? 7 : 6);
  buttons.interact.style.opacity = buttons.interact.dataset.down === '1' ? '0.95' : '0.7';
}

// --- D-pad: una zona con los dos botones adentro ---
function dpadDir(zone, clientX) {
  const r = zone.getBoundingClientRect();
  return clientX < r.left + r.width / 2 ? 'left' : 'right';
}

function refreshDpad() {
  const dirs = [...dpadPointers.values()];
  state.left = dirs.includes('left');
  state.right = dirs.includes('right');
  paint();
}

function createDpad() {
  const zone = document.createElement('div');
  Object.assign(zone.style, {
    position: 'absolute',
    left: `calc(${MARGIN}px + ${insetL})`,
    bottom: `calc(${MARGIN}px + ${insetB})`,
    width: `${SIZE * 2 + GAP}px`,
    height: `${SIZE}px`,
    pointerEvents: 'auto',
    touchAction: 'none',
  });
  buttons.left = makeButton({ left: '0', top: '0' });
  buttons.right = makeButton({ left: `${SIZE + GAP}px`, top: '0' });
  zone.append(buttons.left, buttons.right);

  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(zone, e.pointerId);
    dpadPointers.set(e.pointerId, dpadDir(zone, e.clientX));
    refreshDpad();
  });
  // Con el puntero capturado, pointermove sigue llegando aunque el dedo salga de la zona: la dirección es la
  // del lado en que esté el dedo, sin importar qué tan lejos se vaya.
  zone.addEventListener('pointermove', (e) => {
    if (!dpadPointers.has(e.pointerId)) return;
    const dir = dpadDir(zone, e.clientX);
    if (dpadPointers.get(e.pointerId) !== dir) {
      dpadPointers.set(e.pointerId, dir);
      refreshDpad();
    }
  });
  const release = (e) => {
    if (dpadPointers.delete(e.pointerId)) refreshDpad();
  };
  zone.addEventListener('pointerup', release);
  zone.addEventListener('pointercancel', release);
  zone.addEventListener('lostpointercapture', release);
  return zone;
}

// --- Botón simple (saltar / interactuar) ---
// `onDown`/`onUp` reciben el cambio. Cuenta los punteros encima (dos dedos en el mismo botón no lo sueltan al
// levantar uno).
function createAction(name, css, onDown, onUp) {
  const zone = document.createElement('div');
  Object.assign(zone.style, { position: 'absolute', width: `${SIZE}px`, height: `${SIZE}px`, pointerEvents: 'auto', touchAction: 'none', ...css });
  const btn = makeButton({ left: '0', top: '0' });
  buttons[name] = btn;
  zone.append(btn);
  const pointers = new Set();
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    capture(zone, e.pointerId);
    const was = pointers.size > 0;
    pointers.add(e.pointerId);
    if (!was) onDown();
    btn.dataset.down = '1';
    paint();
  });
  const release = (e) => {
    if (!pointers.delete(e.pointerId)) return;
    if (pointers.size === 0) {
      onUp();
      btn.dataset.down = '0';
      paint();
    }
  };
  zone.addEventListener('pointerup', release);
  zone.addEventListener('pointercancel', release);
  zone.addEventListener('lostpointercapture', release);
  zone.releaseAll = () => {
    pointers.clear();
    btn.dataset.down = '0';
  };
  return zone;
}

function build() {
  root = document.createElement('div');
  root.id = 'touch-controls';
  Object.assign(root.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '10' });

  const pad = document.createElement('div');
  pad.id = 'touch-pad';
  Object.assign(pad.style, { position: 'absolute', inset: '0', pointerEvents: 'none' });

  pad.append(createDpad());
  buttons.interactZone = createAction(
    'interact',
    { right: `calc(${MARGIN + SIZE + GAP}px + ${insetR})`, bottom: `calc(${MARGIN}px + ${insetB})` },
    () => (state.pressed.interact = true),
    () => {},
  );
  buttons.jumpZone = createAction(
    'jump',
    { right: `calc(${MARGIN}px + ${insetR})`, bottom: `calc(${MARGIN + JUMP_RISE}px + ${insetB})` },
    () => {
      state.jumpHeld = true;
      state.pressed.jump = true;
    },
    () => (state.jumpHeld = false),
  );
  pad.append(buttons.interactZone, buttons.jumpZone);
  root.append(pad);
  root.pad = pad;


  // Latido suave del botón interactuar cuando hay algo con qué interactuar en rango.
  const style = document.createElement('style');
  style.textContent = `
    @keyframes touch-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
    #touch-controls .touch-btn.pulse { animation: touch-pulse 0.9s ease-in-out infinite; }
  `;
  document.head.append(style);
  // Dentro de #app: así también se ven en pantalla completa (que se pide sobre #app).
  (document.getElementById('app') ?? document.body).append(root);

  paint();
  applyVisibility();
  Device.onChange(applyVisibility);
}

// Suelta todo (al ocultar los botones, un dedo que seguía encima no debe dejar nada apretado).
function releaseAll() {
  dpadPointers.clear();
  state.left = state.right = state.jumpHeld = false;
  state.pressed.jump = state.pressed.interact = false;
  buttons.interactZone?.releaseAll();
  buttons.jumpZone?.releaseAll();
  if (buttons.left) paint();
}

function applyVisibility() {
  if (!root) return;
  const showPad = wanted && Device.isTouch;
  if (!showPad && root.pad.style.display !== 'none') releaseAll();
  root.pad.style.display = showPad ? 'block' : 'none';
}

export const TouchControls = {
  state,

  init() {
    if (!root) build();
  },

  // La escena de juego dice cada frame si quiere los botones (no en diálogos, muerte, menús...).
  setVisible(value) {
    if (wanted === value) return;
    wanted = value;
    applyVisibility();
  },

  get visible() {
    return wanted && Device.isTouch;
  },

  // Hay algo con qué interactuar en rango: el botón late.
  setInteractHint(value) {
    if (interactHint === value || !buttons.interact) return;
    interactHint = value;
    buttons.interact.classList.toggle('pulse', value);
  },

  // Lee y borra la marca de flanco de una acción ('jump' | 'interact').
  consume(action) {
    const was = state.pressed[action];
    state.pressed[action] = false;
    return was;
  },

  releaseAll,
};
