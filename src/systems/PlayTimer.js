// Timer global de juego.
//
// El estado es un objeto mutable guardado en el registry (compartido por todas las escenas).
// Solo GameScene llama a tick() en su update, así que el tiempo avanza únicamente mientras
// se está jugando: sigue durante los diálogos y se detiene en GameOver y en los menús.
// Las muertes no lo reinician; solo start() lo pone en 0 (al elegir personaje).

const KEY = 'playTimer';

function state(registry) {
  let s = registry.get(KEY);
  if (!s) {
    s = { elapsedMs: 0, running: false };
    registry.set(KEY, s);
  }
  return s;
}

export const PlayTimer = {
  start(registry) {
    const s = state(registry);
    s.elapsedMs = 0;
    s.running = true;
  },
  pause(registry) {
    state(registry).running = false;
  },
  resume(registry) {
    state(registry).running = true;
  },
  // Mutamos el objeto en vez de hacer registry.set cada frame para no emitir eventos de cambio 60 veces por segundo.
  tick(registry, deltaMs) {
    const s = state(registry);
    if (s.running) s.elapsedMs += deltaMs;
  },
  elapsed(registry) {
    return state(registry).elapsedMs;
  },
  isRunning(registry) {
    return state(registry).running;
  },
};

export function formatTime(ms) {
  const total = Math.floor(ms);
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const r = total % 1000;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(r).padStart(3, '0')}`;
}
