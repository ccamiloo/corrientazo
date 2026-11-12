import { Device } from './Device.js';
import { PlayTimer } from './PlayTimer.js';
import { SaveGame } from './SaveGame.js';

// Pausas que no decide el juego sino el celular:
//  - 'portrait': en modo táctil con la pantalla vertical. Se muestra un overlay HTML "Gira tu celular".
//  - 'hidden':   la pestaña se fue a segundo plano (llamada, WhatsApp, bloqueo de pantalla) o la página se ocultó.
// Mientras haya alguna razón activa: las escenas activas quedan en pausa, el PlayTimer no avanza y la música se
// detiene. Al quitarse la última razón se reanuda exactamente lo que se pausó (ni más ni menos: Game puede estar
// pausado a propósito debajo de GameOver y eso no se toca).
//
// Boot y Preload no se pausan: la carga de archivos debe seguir aunque el celular esté vertical.

const NEVER_PAUSE = new Set(['Boot', 'Preload']);
const ROTATE_IMG = 'assets/ui/touch/touch_rotate.png'; // 2 frames de 48x48
const ROTATE_STEP_MS = 600;
const TEXT = 'Gira tu celular para jugar';

let game = null;
const reasons = new Set();
let pausedScenes = [];
let timerWasRunning = false;
let overlay = null;
let rotateTimer = null;

function suspend() {
  // Escenas activas (corriendo) en este instante: son las que se reanudan después.
  pausedScenes = game.scene.getScenes(true).filter((s) => !NEVER_PAUSE.has(s.scene.key));
  for (const s of pausedScenes) s.scene.pause();
  timerWasRunning = PlayTimer.isRunning(game.registry);
  PlayTimer.pause(game.registry);
  game.sound.pauseAll();
  // Si el celular cierra la pestaña estando en segundo plano, que el avance quede guardado.
  SaveGame.saveCurrent(game.registry);
}

function resume() {
  for (const s of pausedScenes) {
    // Solo si sigue en pausa por nosotros (si mientras tanto la escena se detuvo o cambió, no se toca).
    if (s.scene.isPaused()) s.scene.resume();
  }
  pausedScenes = [];
  if (timerWasRunning) PlayTimer.resume(game.registry);
  game.sound.resumeAll();
}

function setReason(reason, active) {
  const before = reasons.size > 0;
  if (active) reasons.add(reason);
  else reasons.delete(reason);
  const after = reasons.size > 0;
  if (!before && after) suspend();
  else if (before && !after) resume();
}

// --- Texto con la fuente del juego (BMFont: PNG + XML), dibujado en un canvas a escala entera ---
async function drawPixelText(canvas, text, scale) {
  const [xml, img] = await Promise.all([
    fetch('assets/fonts/corrientazo_font.xml').then((r) => r.text()),
    new Promise((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = fail;
      i.src = 'assets/fonts/corrientazo_font.png';
    }),
  ]);
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const lineHeight = Number(doc.querySelector('common').getAttribute('lineHeight'));
  const chars = new Map();
  for (const c of doc.querySelectorAll('char')) {
    const n = (k) => Number(c.getAttribute(k));
    chars.set(n('id'), { x: n('x'), y: n('y'), w: n('width'), h: n('height'), xo: n('xoffset'), yo: n('yoffset'), adv: n('xadvance') });
  }
  const glyphs = [...text].map((ch) => chars.get(ch.codePointAt(0)) ?? chars.get(32));
  const width = glyphs.reduce((s, g) => s + g.adv, 0);
  canvas.width = (width + 2) * scale;
  canvas.height = (lineHeight + 2) * scale;
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  // Contorno como en el juego (4 copias corridas 1 px en el color de contorno) y el texto blanco encima.
  const draw = (dx, dy) => {
    let x = 1;
    for (const g of glyphs) {
      if (g.w) ctx.drawImage(img, g.x, g.y, g.w, g.h, (x + g.xo + dx) * scale, (1 + g.yo + dy) * scale, g.w * scale, g.h * scale);
      x += g.adv;
    }
  };
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) draw(dx, dy);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#2b1e2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';
  draw(0, 0);
}

function buildOverlay() {
  overlay = document.createElement('div');
  overlay.id = 'rotate-overlay';
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '50',
    background: '#0b0d12',
    display: 'none',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    touchAction: 'none',
  });
  const icon = document.createElement('div');
  Object.assign(icon.style, {
    width: '144px', // 48 a x3
    height: '144px',
    backgroundImage: `url(${ROTATE_IMG})`,
    backgroundSize: '288px 144px',
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  });
  // Mientras carga la fuente (o si falla), una sans de respaldo.
  const label = document.createElement('div');
  label.textContent = TEXT;
  Object.assign(label.style, { color: '#fff', font: '600 18px system-ui, sans-serif', textAlign: 'center', padding: '0 16px' });
  overlay.append(icon, label);
  (document.getElementById('app') ?? document.body).append(overlay);

  const canvas = document.createElement('canvas');
  canvas.style.imageRendering = 'pixelated';
  canvas.style.maxWidth = '92vw';
  drawPixelText(canvas, TEXT, 2)
    .then(() => label.replaceWith(canvas))
    .catch(() => {});

  let frame = 0;
  overlay.tick = () => {
    frame = 1 - frame;
    icon.style.backgroundPosition = `${-frame * 144}px 0`;
  };
}

function updateOrientation() {
  const portrait = Device.isTouch && Device.isPortrait;
  overlay.style.display = portrait ? 'flex' : 'none';
  if (portrait && !rotateTimer) rotateTimer = setInterval(overlay.tick, ROTATE_STEP_MS);
  if (!portrait && rotateTimer) {
    clearInterval(rotateTimer);
    rotateTimer = null;
  }
  setReason('portrait', portrait);
}

export const Lifecycle = {
  init(phaserGame) {
    game = phaserGame;
    buildOverlay();

    // Orientación: se recalcula con cualquier cambio de tamaño y con el cambio de modo (laptop táctil).
    const orient = () => updateOrientation();
    window.addEventListener('resize', orient);
    window.addEventListener('orientationchange', orient);
    window.visualViewport?.addEventListener('resize', orient);
    Device.onChange(orient);

    // Segundo plano. Phaser ya duerme el loop con la pestaña oculta, pero eso no pausa escenas ni el timer
    // de forma explícita; aquí sí, y además se guarda el avance.
    document.addEventListener('visibilitychange', () => setReason('hidden', document.visibilityState === 'hidden'));
    window.addEventListener('pagehide', () => setReason('hidden', true));
    window.addEventListener('pageshow', () => setReason('hidden', document.visibilityState === 'hidden'));

    // Las escenas arrancan después de este init: la primera revisión espera al primer frame.
    game.events.once('ready', orient);

    // Una escena que arranca mientras todo está en pausa (p. ej. Preload termina de cargar con el celular vertical
    // y lanza el título) también queda en pausa, y el timer no se escapa.
    game.events.on('prestep', () => {
      if (!reasons.size) return;
      for (const s of game.scene.getScenes(true)) {
        if (NEVER_PAUSE.has(s.scene.key) || pausedScenes.includes(s)) continue;
        s.scene.pause();
        pausedScenes.push(s);
      }
      if (PlayTimer.isRunning(game.registry)) {
        timerWasRunning = true;
        PlayTimer.pause(game.registry);
      }
    });
  },

  get suspended() {
    return reasons.size > 0;
  },
};
