// Nivel 5: la obra. Una sola sala. Con arte (campo `art`); si no carga, greybox.
//
// FORMATO (el mismo de las otras salas; este archivo se usará para generar el arte)
// `layout`: una string por fila de tiles de 16x16, de arriba hacia abajo. Mide 120 x 17 tiles = 1920 x 272 px.
//   '#'  suelo de obra                             sólido
//   'S'  sacos de cemento                          sólido
//   'T'  tablón del andamio                        SOLO sólido por arriba (lo arma la sala, no RoomBuilder), sin rebote
//   'E'  concreto (losa y edificios)               sólido
//   'c'  mocho de columna con varillas             sólido
//   'V'  viga de acero                             sólido; su cara de arriba la recorre la onda
//   'W'  tablón de madera sobre la viga            sólido, siempre seguro
//   'P'  poste de la línea                         decorativo
//   '.'  vacío
// Posiciones en coordenadas de tile (x = columna, y = fila de apoyo) o en px de mundo cuando lo dice el campo.
// El suelo apoya en la fila 13 (y = 208); la losa, la viga y el edificio del fondo, en la fila 8 (y = 128).
//
// Ruta (de izquierda a derecha):
//   1. Concreto: saltar C1 desde su borde a los sacos (o cruzarlo con la mezcladora apagada); lo mismo con C2.
//   2. Andamio: tablón de abajo (2 tiles) → tablón de arriba (3 tiles, atravesándolo) siguiendo al arco, o ir por
//      abajo hasta el final y asomarse en S4 cuando el arco está en S1-S2. Saltar el hueco de la col 47 a la losa.
//   3. Grúa: pasar bajo la carga levantada sin saltar; saltar los mochos (cols 58 y 70) con la carga lejos.
//   4. Viga: de tablón en tablón (cols 86, 91-92, 97, 102), parado en madera o en el aire cuando pasa la onda.
//   5. La ingeniera (col 112).

export const construction = {
  id: 'construction',
  background: 'construction',
  script: 'construction', // lógica: src/levels/constructionLevel.js

  // Arte: construction_back (postes, aisladores, la línea, parales y crucetas del andamio, pluma, torre, mezcladora
  // quieta) en depth interior; construction_tiles (sólidos y tablones) en depth tiles; props en
  // assets/props/construction/ (posiciones en su README.txt). Las colisiones y zonas letales salen del layout y de
  // los campos de abajo, no del arte.
  art: {
    wall: 'assets/rooms/construction/construction_back.png',
    tiles: 'assets/rooms/construction/construction_tiles.png',
    props: 'assets/props/construction/props.json',
  },

  // Caracteres propios de la obra. 'T' no es sólido para RoomBuilder (se dibuja, pero no colisiona): los tablones
  // del andamio los arma la sala como plataformas de un solo sentido.
  legend: {
    '#': { texture: 'tile-site', solid: true },
    S: { texture: 'tile-sack', solid: true },
    T: { texture: 'tile-plank', solid: false },
    E: { texture: 'tile-concrete', solid: true },
    c: { texture: 'tile-rebar-stub', solid: true },
    V: { texture: 'tile-beam', solid: true },
    W: { texture: 'tile-wood', solid: true },
  },

  layout: [
    '.P....................................................................................................................P.', // 0
    '.P....................................................................................................................P.', // 1  línea de alta tensión en y = 12
    '.P....................................................................................................................P.', // 2
    '.P....................................................................................................................P.', // 3
    '.P....................................................................................................................P.', // 4
    '.P....................................................................................................................P.', // 5
    '.P....................................................................................................................P.', // 6
    '.P........................................................c...........c...............W....WW....W....W...............P.', // 7  mochos (58, 70) y tablones sobre la viga
    '.P............................TTTTTTTTTTTTTTTTT.EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEVVVVVVVVVVVVVVVVVVVVVVVVEEEEEEEEEEEEEEE', // 8  tablón de arriba (y = 128), losa, viga (81-104)
    '.P..............................................EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // 9
    '.P..............................................EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // 10
    '.P................SSS.........TTTTTTTTTTTTTTTTT.EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // 11 sacos (18-20), tablón de abajo (y = 176)
    '.P................SSS...........................EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', // 12
    '########################################################################################################################', // 13 suelo (y = 208)
    '########################################################################################################################', // 14
    '########################################################################################################################', // 15
    '########################################################################################################################', // 16 4 filas de suelo: regla de la caja de diálogo
  ],

  spawn: { x: 2, y: 13 },

  npcs: [
    { id: 'maestro', texture: 'maestro', x: 6, y: 13 },
    { id: 'ingeniera', texture: 'ingeniera', x: 112, y: 8 },
  ],

  // Línea de alta tensión (px): segmento de lado a lado, siempre letal. Aisladores en los postes (cols 1 y 118).
  powerLine: { x1: 0, x2: 1920, y: 12 },

  // Mezcladora decorativa (tiles, apoyada en el suelo) y su cable roto metido en C2 (px).
  // Con arte: sprite 64x40 con esquina en art (trae el cable roto) y la chispa de la punta pelada centrada en spark.
  mixer: { x: 26, y: 13, w: 2, cable: { x1: 424, y1: 196, x2: 392, y2: 207 }, art: { x: 388, y: 168, spark: { x: 392, y: 206 } } },
  // Concreto fresco (px, sobre el suelo y = 208): mata con la mezcladora girando.
  concrete: [
    { id: 'C1', x1: 208, x2: 288 },
    { id: 'C2', x1: 336, x2: 416 },
  ],
  concreteArtY: 202, // esquina de arriba de las piezas de 16x6 del arte

  // Tablón de arriba del andamio dividido en tramos (px). El arco cae de la línea al tablón: mata en x1-x2,
  // y de arcTop a arcBottom. Orden de la secuencia de ida y vuelta: el de la lista.
  arcs: {
    top: 12,
    bottom: 128,
    // Con arte: plank_fx (16x7) con esquina en y = plankY sobre cada 16 px del tramo; el arco (40x118) centrado en el
    // tramo con esquina en y = arcY; line_spark centrado en (centro del tramo, y de la línea).
    art: { plankY: 127, arcY: 11 },
    segments: [
      { id: 'S1', x1: 480, x2: 544 },
      { id: 'S2', x1: 544, x2: 608 },
      { id: 'S3', x1: 608, x2: 672 },
      { id: 'S4', x1: 672, x2: 752 },
    ],
  },

  // Grúa (px). Pluma y torre decorativas. El carro va y viene entre trolleyMinX y trolleyMaxX (empieza en el mínimo
  // hacia la derecha); el cable del gancho baja de (x, hookY) al borde de arriba de la carga, que oscila entre
  // loadUpTop y loadDownTop.
  crane: {
    boom: { x1: 800, x2: 1260, y: 26 },
    tower: { x: 1024, w: 16, bottom: 128 },
    trolleyMinX: 880,
    trolleyMaxX: 1200,
    hookY: 30,
    loadUpTop: 50,
    loadDownTop: 114,
    // Con arte: el sprite load (44x12) va con su esquina en (xCarro + loadDx, bordeArriba + loadDy) y su parte de
    // adentro coincide con el rect que mata (40x8); trolley (16x8) con esquina en (xCarro + trolleyDx, trolleyY),
    // encima del cable; boom_spark (12x8) fijo en la punta de la grúa pegada a la línea.
    art: { loadDx: -22, loadDy: -2, trolleyDx: -8, trolleyY: 26, cableColor: 0x1e1822, boomSpark: { x: 1026, y: 10 } },
  },

  // Viga de acero (px): la onda recorre su cara de arriba (y = top) de xStart a xEnd (hacia la izquierda).
  // Con arte: 3 piezas beam_wave (16x8) desde (centro - 24) en y = art.y, y 2 chispas (spark) en el aviso.
  beam: {
    xStart: 1680,
    xEnd: 1296,
    top: 128,
    art: {
      y: 120,
      sparks: [
        { x: 1676, y: 124 },
        { x: 1670, y: 127 },
      ],
    },
  },

  // Cascos (tiles, pies en la fila y): al tocarlos guardan el punto de reaparición.
  checkpoints: [
    { id: 'CP1', x: 50, y: 8 },
    { id: 'CP2', x: 80, y: 8 },
  ],
};
