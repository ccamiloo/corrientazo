// NPCs con spritesheet (public/assets/npcs/). `texture` es la key del spritesheet; PreloadScene crea sus
// animaciones desde el JSON con keys `${texture}_${nombre}` (p. ej. 'papa_idle').
// Todos miran a la derecha en el arte: se usa flipX para que miren a la izquierda.
export const NPC_SHEETS = [
  { texture: 'papa', image: 'assets/npcs/papa.png', data: 'assets/npcs/papa.json' },
  { texture: 'abuela', image: 'assets/npcs/abuela.png', data: 'assets/npcs/abuela.json' },
  { texture: 'vecino', image: 'assets/npcs/vecino.png', data: 'assets/npcs/vecino.json' },
  { texture: 'tomas', image: 'assets/npcs/tomas.png', data: 'assets/npcs/tomas.json' },
  { texture: 'tecnico', image: 'assets/npcs/tecnico.png', data: 'assets/npcs/tecnico.json' },
  { texture: 'vendedor', image: 'assets/npcs/vendedor.png', data: 'assets/npcs/vendedor.json' },
  { texture: 'carmen', image: 'assets/npcs/carmen.png', data: 'assets/npcs/carmen.json' },
  { texture: 'maestro', image: 'assets/npcs/maestro.png', data: 'assets/npcs/maestro.json' },
  { texture: 'ingeniera', image: 'assets/npcs/ingeniera.png', data: 'assets/npcs/ingeniera.json' },
  { texture: 'seno', image: 'assets/npcs/seno.png', data: 'assets/npcs/seno.json' }, // escena final
];

export const npcAnimKey = (texture, name) => `${texture}_${name}`;
