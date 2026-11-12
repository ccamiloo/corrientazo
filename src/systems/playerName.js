// Nombre del jugador para la tabla de tiempos: reglas de qué se puede escribir y dónde se guarda.

export const NAME_MAX = 12;
const STORAGE_KEY = 'corrientazo.playerName';

// Un carácter permitido: letras (con ñ, tildes y ü, que la fuente pixel sí trae), números, espacio, guion y
// guion bajo. Nada de '#' ni '°' (la fuente no los tiene).
export const isNameChar = (ch) => /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _-]$/.test(ch);

// Deja solo caracteres permitidos y corta a NAME_MAX (para lo que venga de localStorage).
export const sanitizeName = (value) => [...String(value ?? '')].filter(isNameChar).slice(0, NAME_MAX).join('');

// localStorage puede no existir o lanzar (modo privado, cookies bloqueadas): todo dentro de try/catch.
export function loadPlayerName() {
  try {
    const name = sanitizeName(window.localStorage.getItem(STORAGE_KEY)).trim();
    return name || null;
  } catch {
    return null;
  }
}

export function savePlayerName(name) {
  try {
    window.localStorage.setItem(STORAGE_KEY, name);
  } catch {
    // Sin almacenamiento: el nombre queda solo en el registry de esta sesión.
  }
}
