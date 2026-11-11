// Personajes seleccionables, en el orden de la pantalla de selección. `texture` es la key que usa el resto del código.
//  - Con `sheet`: spritesheet real. PreloadScene carga el PNG y el JSON (índices de frames y animaciones)
//    y crea las animaciones con keys `${texture}-${nombre}` (p. ej. 'moises-walk').
//  - Sin `sheet`: placeholder; PreloadScene genera un rectángulo de `color` con esa key.
//  - `gender`: 'm' o 'f'. Decide cómo se reemplazan los marcadores de género de los diálogos (ver GENDER_WORDS).
const sheet = (name) => ({ image: `assets/characters/${name}.png`, data: `assets/characters/${name}.json` });

export const CHARACTERS = [
  { name: 'Moisés', texture: 'moises', gender: 'm', sheet: sheet('moises') },
  { name: 'Camilo', texture: 'camilo', gender: 'm', sheet: sheet('camilo') },
  { name: 'Evelyn', texture: 'evelyn', gender: 'f', sheet: sheet('evelyn') },
  { name: 'Sebastián', texture: 'sebastian', gender: 'm', sheet: sheet('sebastian') },
  { name: 'Danna', texture: 'danna', gender: 'f', sheet: sheet('danna') },
];

// Key de una animación de personaje: animKey('moises', 'walk') → 'moises-walk'.
export const animKey = (texture, name) => `${texture}-${name}`;

// Marcadores de género para los textos: `{mijo}` → 'mijo' o 'mija' según el personaje elegido.
// Para agregar uno nuevo basta con sumar una entrada aquí: { marcador: [masculino, femenino] }.
// Si una palabra aparece al inicio de frase, se agrega aparte con mayúscula ({Mijo}).
export const GENDER_WORDS = {
  mijo: ['mijo', 'mija'],
  Mijo: ['Mijo', 'Mija'],
  o: ['o', 'a'], // terminación suelta: 'list{o}' → 'listo' / 'lista'
  nieto: ['nieto', 'nieta'],
};

// Reemplaza en `text` todos los marcadores `{clave}` de GENDER_WORDS según `gender` ('m' | 'f').
// Los marcadores que no están en la tabla ({n}, {total}...) se dejan intactos para que los llene el nivel.
export function genderize(text, gender) {
  const i = gender === 'f' ? 1 : 0;
  return text.replace(/\{(\w+)\}/g, (match, key) => (GENDER_WORDS[key] ? GENDER_WORDS[key][i] : match));
}

// Personaje elegido en la partida actual (el índice vive en el registry).
export const currentCharacter = (registry) => CHARACTERS[registry.get('characterIndex') ?? 0] ?? CHARACTERS[0];
