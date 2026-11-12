// Nivel 3: el parque. Una sola sala, greybox (sin arte). Media mañana con viento.
//
// FORMATO (el mismo de house.js y street_1.js; este archivo se usará para generar el arte)
// `layout`: una string por fila de tiles de 16x16, de arriba hacia abajo. Mide 100 x 17 tiles = 1600 x 272 px.
//   '#'  suelo (pasto)                        sólido
//   'E'  escalón de los juegos                sólido
//   'H'  torre de los juegos                  sólido
//   'R'  puente de los juegos                 sólido
//   'B'  banca                                sólido
//   'P'  poste de la línea                    decorativo, SIN colisión
//   'L'  farol (con la caja destapada)        decorativo
//   'W'  asta de la manga de viento           decorativo (la manga la dibuja la sala)
//   'T'  tronco del árbol                     decorativo (pero electrocuta durante la ráfaga, ver `tree`)
//   '.'  vacío
// En esta sala 'T' NO es el techo sólido de la casa y la calle: `legend` lo redefine (ver RoomBuilder.legendOf).
// Posiciones en coordenadas de tile (x = columna, y = fila de apoyo) o en px de mundo cuando lo dice el campo.
// Todo lo del parque se apoya en la fila 13 (y = 208 px).
//
// Ruta (de izquierda a derecha):
//   1. Columpio: desde el suelo (x < 256) se sube al asiento en su extremo izquierdo y se baja en el derecho,
//      pasando el pasto electrificado Z1 (x 256-400).
//   2. Juegos: escalones de 1 y 2 tiles (cols 28-29) → torre 1 (3 tiles, cols 30-32) → hueco de 2 → puente
//      (cols 35-37) → hueco de 2 → torre 2 (cols 40-41) → bajar en x ≥ 688, pasando sobre Z2 (x 528-688).
//      En ráfaga los huecos no se alcanzan: el viento deja al jugador en el pasto.
//   3. Árbol: en la ráfaga el tronco electrocuta y caen chispas de los dos puntos de contacto con la línea.
//      Zona segura: la banca y alrededores (x 832-880). Se cruza en calma.
//   4. Hilos de cometa S1 y S2: cuelgan casi hasta el suelo; solo se pasa por debajo en la ráfaga, cuando el
//      viento los sube hacia la izquierda. Zonas de espera: x 984-1070 (S1) y x 1200-1334 (S2).
//   5. El técnico (col 96): hablar con él termina el nivel.

export const park = {
  id: 'park',
  background: 'park',
  script: 'park', // lógica: src/levels/parkLevel.js

  // Caracteres propios del parque (ver la leyenda de arriba).
  legend: {
    '#': { texture: 'tile-grass', solid: true },
    H: { texture: 'tile-tower', solid: true },
    R: { texture: 'tile-bridge', solid: true },
    L: { texture: 'lamp', solid: false },
    W: { texture: 'sock-pole', solid: false },
    T: { texture: 'trunk', solid: false },
  },

  layout: [
    '....................................................................................................', // 0
    '....................................................................................................', // 1
    '..............................................P..............................................P......', // 2  punta de los postes (cols 46 y 93)
    '..............................................P..............................................P......', // 3  línea a y = 48 (borde de arriba de esta fila)
    '..............................................P..............................................P......', // 4
    '..............................................P..............................................P......', // 5
    '..............................................P..............................................P......', // 6
    '....................L.........................P........TT....................................P......', // 7  farol 1 (col 20), tronco (cols 55-56)
    '....................L.........................P........TT....................................P......', // 8
    '............W.......L.........................P........TT.........W..........................P......', // 9  mangas (cols 12 y 66)
    '............W.......L.........HHH..RRR..HH....P........TT.........W..........................P......', // 10 torre 1, puente y torre 2 (tope a 3 tiles)
    '............W.......L........EHHH...L...HH....P........TT.........W..........................P......', // 11 escalón de 2 (col 29), farol 2 bajo el puente (col 36)
    '............W.......L.......EEHHH...L...HH....P.....BB.TT.........W..........................P......', // 12 escalón de 1 (col 28), banca (cols 52-53)
    '####################################################################################################', // 13 suelo (apoyo de todo)
    '####################################################################################################', // 14
    '####################################################################################################', // 15
    '####################################################################################################', // 16 4 filas de suelo: regla de la caja de diálogo
  ],

  // Arte de la sala (public/assets/rooms/park/ y public/assets/props/park/, ver README.txt ahí).
  // Las dos imágenes miden lo mismo que la sala (1600x272) y van en (0, 0). `tiles` (depth 0) reemplaza el
  // dibujo tile por tile; `wall` (depth -1) trae postes, línea, marco del columpio, faroles, astas, árbol y
  // cometas. La colisión sigue saliendo del layout.
  art: {
    wall: 'assets/rooms/park/park_back.png',
    tiles: 'assets/rooms/park/park_tiles.png',
    props: 'assets/props/park/props.json',
  },

  spawn: { x: 2, y: 13 },

  npcs: [
    { id: 'tomas', texture: 'tomas', x: 8, y: 13 },
    { id: 'tecnico', texture: 'tecnico', x: 96, y: 13 },
  ],

  // Línea eléctrica (decorativa), en px: recta entre los postes.
  // Ojo: termina en x = 1504, el borde DERECHO del poste de la col 93 (el izquierdo es 1488).
  powerLine: { x1: 752, y1: 48, x2: 1504, y2: 48 },

  // Pasto electrificado alrededor de los faroles destapados: siempre activo, mata al pisarlo.
  // `x` = columna izquierda, `w` = ancho en tiles, apoyado en la fila `y`.
  grass: [
    { id: 'Z1', x: 16, y: 13, w: 9 }, // x 256-400, farol 1
    { id: 'Z2', x: 33, y: 13, w: 10 }, // x 528-688, farol 2 (bajo el puente)
  ],

  // Columpio (px): pivote, largo de la cadena y travesaño/patas del marco (decorativos).
  // Amplitud y periodo en SWING (constants.js). El asiento cuelga de la punta de la cadena (su borde de arriba).
  swing: { pivotX: 328, pivotY: 104, chain: 84, beamY: 96, legX1: 240, legX2: 416 },

  // Árbol (px): tronco que electrocuta durante la ráfaga y dos puntos de contacto con la línea que sueltan chispas.
  // El tronco coincide con las columnas 'T' del layout (cols 55-56, filas 7-12).
  tree: {
    trunk: { x: 880, y: 112, w: 32, h: 96 },
    contacts: [
      { id: 'CP1', x: 824, y: 48 },
      { id: 'CP2', x: 968, y: 48 },
    ],
    // Overlay del árbol electrificado (prop tree_live, solo en la ráfaga): esquina superior izquierda y tamaño
    // esperado de su frame. Si el arte cargado no mide eso, se usa el tinte greybox del tronco.
    live: { x: 776, y: 40, w: 240, h: 168 },
  },

  // Hilos de cometa (px): ancla en la línea y largo. La punta queda a 8 px del suelo (y = 200).
  strings: [
    { id: 'S1', x: 1160, y: 48, length: 152 },
    { id: 'S2', x: 1416, y: 48, length: 152 },
  ],
  // Cometas enredadas en la línea (decorativas): la de Tomás sobre S2 y una vieja rota sobre S1.
  kites: [
    { id: 'tomas', x: 1416, y: 48 },
    { id: 'old', x: 1160, y: 48 },
  ],
};
