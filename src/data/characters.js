// Personajes seleccionables. `texture` es la key que usa el resto del código.
//  - Con `sheet`: spritesheet real. PreloadScene carga el PNG y el JSON (índices de frames y animaciones)
//    y crea las animaciones con keys `${texture}-${nombre}` (p. ej. 'moises-walk').
//  - Sin `sheet`: placeholder; PreloadScene genera un rectángulo de `color` con esa key.
export const CHARACTERS = [
  {
    name: 'Moisés',
    texture: 'moises',
    sheet: { image: 'assets/characters/moises.png', data: 'assets/characters/moises.json' },
  },
  { name: 'Volta', color: 0xff7a6b, texture: 'player-1' },
  { name: 'Ohmar', color: 0x7bd88f, texture: 'player-2' },
];

// Key de una animación de personaje: animKey('moises', 'walk') → 'moises-walk'.
export const animKey = (texture, name) => `${texture}-${name}`;
