// Nivel 4: el mercado. Una sola sala, mediodía. Con arte (campo `art`); si no carga, greybox.
//
// FORMATO (el mismo de las otras salas; este archivo se usará para generar el arte)
// `layout`: una string por fila de tiles de 16x16, de arriba hacia abajo. Mide 110 x 17 tiles = 1760 x 272 px.
//   '#'  piso de baldosa                          sólido
//   'K'  cajas                                    sólido
//   'A'  toldo de lona                            SOLO sólido por arriba y rebota (lo arma la sala, no RoomBuilder)
//   'F'  puesto de frutas (techo)                 sólido
//   'M'  mostrador, tramo de madera               sólido, siempre seguro
//   'm'  mostrador, tramo de lata                 sólido; electrocuta al estar parado encima con el congelador prendido
//   'P'  poste de los enganches                   decorativo
//   '.'  vacío
// Posiciones en coordenadas de tile (x = columna, y = fila de apoyo) o en px de mundo cuando lo dice el campo.
// Todo lo del mercado se apoya en la fila 13 (y = 208 px).
//
// Ruta (de izquierda a derecha):
//   1. Pescado: caminar por el charco W1 con el congelador apagado, o subir a las cajas (cols 13-14) → toldo 1 →
//      rebotar (con el congelador prendido el rebote pega con el enganche H1) → caer pasando x = 400.
//   2. Frutas: saltar al toldo 2 (3 tiles), rebotar y caer en el techo de las frutas (y = 112) entre x 528 y 580;
//      pasar la bajante H2 apagada; bajar al mostrador (x ≥ 672) por encima de W2a.
//   3. Carnes: con el congelador prendido solo es seguro pararse en la madera (cols 42-44, 48-49, 54-55, 59-61) y
//      no se puede saltar sobre la lata (pega con H3). Bajar por encima de W2b (o por W2b apagado).
//   4. Carretilla: pasar la bajante H4 apagada sin que la carretilla empuje contra ella.
//   5. Cajas: 1 → 2 → 4 → 4 → 6 tiles (cols 88, 89, 90-92, 93-94), sin hueco. Subir en la pausa del
//      pulpo y bajar el taco. Después, doña Carmen. Del lado de doña Carmen hay escalones de 2 y 4 tiles
//      (cols 96 y 95, `extraCrates`) para volver al taco si se bajó sin apagarlo.

export const market = {
  id: 'market',
  background: 'market',
  script: 'market', // lógica: src/levels/marketLevel.js

  // Arte: market_back (fondos de los puestos, poste, manojo, congelador, extensión, columna del taco) en depth
  // interior; market_tiles (piso, cajas, frutas, mostrador) en depth tiles; props en assets/props/market/.
  art: {
    wall: 'assets/rooms/market/market_back.png',
    tiles: 'assets/rooms/market/market_tiles.png',
    props: 'assets/props/market/props.json',
  },

  // Caracteres propios del mercado. 'A' no es sólido para RoomBuilder (sin textura: no se dibuja tile por tile):
  // los toldos los arma la sala como plataformas de un solo sentido que rebotan.
  legend: {
    '#': { texture: 'tile-floor', solid: true },
    K: { texture: 'tile-crate', solid: true },
    F: { texture: 'tile-fruit', solid: true },
    M: { texture: 'tile-wood', solid: true },
    m: { texture: 'tile-metal', solid: true },
    A: { texture: null, solid: false },
  },

  layout: [
    '..............................................................................................................', // 0
    '..............................................................................................................', // 1
    '..........P...................................................................................................', // 2  punta del poste (col 10): sale el manojo de enganches
    '..........P...................................................................................................', // 3
    '..........P...................................................................................................', // 4
    '..........P...................................................................................................', // 5
    '..........P...................................................................................................', // 6
    '..........P......................FFFFFF......................................................KK...............', // 7  techo de las frutas (y = 112) y cajas de 6 (cols 93-94)
    '..........P......................FFFFFF......................................................KK...............', // 8
    '..........P......AAAAA...........FFFFFF...................................................KKKKKK..............', // 9  toldo 1 (cols 17-21, y = 144); cajas de 4 (cols 90-92)
    '..........P..................AAA.FFFFFF...................................................KKKKKK..............', // 10 toldo 2 (cols 29-31, y = 160)
    '..........P..KK..................FFFFFF...MMMmmmMMmmmmMMmmmMMM...........................KKKKKKKK.............', // 11 cajas del pescado (cols 13-14), mostrador (y = 176)
    '..........P..KK..................FFFFFF...MMMmmmMMmmmmMMmmmMMM..........................KKKKKKKKK.............', // 12 cajas de 1 (col 88)
    '##############################################################################################################', // 13 piso (apoyo de todo)
    '##############################################################################################################', // 14
    '##############################################################################################################', // 15
    '##############################################################################################################', // 16 4 filas de piso: regla de la caja de diálogo
  ],

  spawn: { x: 2, y: 13 },

  npcs: [
    { id: 'vendedor', texture: 'vendedor', x: 6, y: 13 },
    { id: 'carmen', texture: 'carmen', x: 103, y: 13 },
  ],

  // Congelador del pescado (decorativo): tiles { x, y, w, h }, centro de su luz y esquina de las ondas (px).
  freezer: { x: 11, y: 10, w: 2, h: 3, light: { x: 192, y: 166 }, waves: { x: 172, y: 134 } },

  // Charcos: `x` = columna izquierda, `w` = ancho en tiles, apoyados en la fila `y`. Sin red: todos se prenden
  // juntos con el congelador.
  puddles: [
    { id: 'W1', x: 15, y: 13, w: 10 }, // x 240-400
    { id: 'W2a', x: 39, y: 13, w: 3 }, // x 624-672
    { id: 'W2b', x: 62, y: 13, w: 3 }, // x 992-1040
  ],
  // Extensión con un empalme de cinta cruzando W1 (decorativa), px.
  extension: { x1: 210, x2: 420, y: 207, tapeX: 318 },

  // Enganches pelados (px): matan con el congelador prendido.
  hookups: [
    { id: 'H1', x1: 280, y1: 72, x2: 344, y2: 80 }, // sobre el toldo 1
    { id: 'H2', x1: 584, y1: 44, x2: 598, y2: 110 }, // bajante sobre el techo de las frutas
    { id: 'H3a', x1: 712, y1: 130, x2: 776, y2: 130 }, // sobre la lata 1
    { id: 'H3b', x1: 792, y1: 130, x2: 872, y2: 130 }, // sobre la lata 2
    { id: 'H3c', x1: 888, y1: 130, x2: 952, y2: 130 }, // sobre la lata 3
    { id: 'H4', x1: 1196, y1: 40, x2: 1204, y2: 200 }, // bajante hasta el piso, en el pasillo de la carretilla
  ],
  // Manojo de 3 cables sucios (decorativo) que sale de la punta del poste y cruza el mercado con comba.
  bundle: { x1: 168, y1: 40, x2: 1760, yMin: 34, yMax: 48 },

  // Toldos (px): rect de la lona; su borde de arriba es la cara sólida.
  awnings: [
    { id: 'A1', x: 272, y: 144, w: 80 }, // cols 17-21
    { id: 'A2', x: 464, y: 160, w: 48 }, // cols 29-31
  ],

  // Carretilla (px): caja de 32x16 que va y viene; su borde izquierdo recorre de minX a maxX - 32.
  // Empieza en minX hacia la derecha. Velocidad y empujón en CART (constants.js).
  cart: { minX: 1056, maxX: 1392 },

  // El pulpo: pies en (x, y), px.
  pulpo: { x: 1600, y: 208 },

  // Taco (px): rect en la pared; se alcanza parado en las cajas de las cols 93-94 (pies en standY).
  breaker: { x: 1504, y: 72, w: 16, h: 20, standY: 112 },

  // Cajas agregadas DESPUÉS del arte (ya están en el layout como 'K'): market_tiles.png no las trae y la sala las
  // dibuja recortando la caja de extraCratesSource. Si se regenera el arte, incluirlas y borrar esto.
  extraCrates: [[95, 9], [95, 10], [95, 11], [95, 12], [96, 11], [96, 12]],
  extraCratesSource: { x: 94, y: 12 },

  // Aviso de doña Carmen: la primera vez que el jugador pasa esta x (px).
  carmenWarnX: 1380,
};
