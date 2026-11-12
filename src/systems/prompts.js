import { Device } from './Device.js';

// Todos los textos que le dicen al jugador qué tecla tocar, en su versión de teclado y en la táctil.
// prompt(id) devuelve la del modo actual; bindPrompt mantiene un texto al día si el modo cambia en vivo.
// (La fuente no trae '·', '▼' ni '■'; las flechas ← → ↑ ↓ sí.)
const PROMPTS = {
  titleStart: { key: 'Enter o clic para jugar', touch: 'Toca para empezar' },
  titleBoard: { key: 'T: Tabla de tiempos', touch: 'Tabla de tiempos' },
  titleContinue: { key: 'C: Continuar {level}', touch: 'Continuar {level}' },
  selectHelp: { key: '← → para escoger     Enter para jugar', touch: 'Toca un personaje' },
  nameWrite: { key: 'Escribe tu nombre', touch: 'Toca la comanda para escribir tu nombre' },
  nameConfirm: { key: 'Enter para confirmar', touch: '' },
  boardDone: { key: 'Presiona cualquier tecla', touch: 'Toca para volver' },
  boardFailed: { key: 'Enter: reintentar     Otra tecla: salir', touch: '' },
  controlsStart: { key: 'Presiona cualquier tecla para empezar', touch: 'Toca para empezar' },
  // Avisos del tutorial de la casa (los botones táctiles llevan las mismas flechas dibujadas).
  hintMove: { key: '← → para moverte', touch: '← → para moverte' },
  hintJump: { key: 'Espacio para saltar', touch: '↑ para saltar' },
  hintTalk: { key: '↓ para hablar', touch: '↓ para hablar' },
};

export function prompt(id, vars = {}) {
  const p = PROMPTS[id];
  if (!p) return id;
  let text = Device.isTouch ? p.touch : p.key;
  for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, v);
  return text;
}

// Pone el texto del aviso en `target` (cualquier objeto con setText) y lo actualiza al cambiar de modo mientras la
// escena viva. `onChange(isTouch)` opcional: para mostrar u ocultar piezas que solo existen en un modo.
export function bindPrompt(scene, target, id, vars, onChange) {
  const apply = () => {
    target.setText(prompt(id, vars));
    onChange?.(Device.isTouch);
  };
  apply();
  Device.onChangeWhile(scene, apply);
  return target;
}
