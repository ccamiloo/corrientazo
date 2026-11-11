// Nivel 2, sala 1: la calle. Greybox (sin arte). Aquí ya se puede morir: cable culebra y charcos.
//
// FORMATO (el mismo de house.js; este archivo se usará para generar el arte)
// `layout`: una string por fila de tiles de 16x16, de arriba hacia abajo. Mide 80 x 17 tiles = 1280 x 272 px.
//   '#'  suelo (calle)                                   sólido
//   'C'  carro parqueado (6 x 2)                         sólido
//   'B'  banca (la del arco del cable y la del paradero) sólido
//   'A'  andén elevado (1 tile)                          sólido
//   'S'  cartelera del paradero (1 x 2, sobre el andén)  sólido
//   'M'  matera (1 x 1)                                  sólido
//   'T'  techo del paradero                              sólido
//   'P'  poste dañado                                    decorativo, SIN colisión
//   '|'  columna del paradero                            decorativa, SIN colisión
//   '.'  vacío
// Los charcos NO van en el layout: son zonas sin colisión sobre el suelo (ver `puddles`).
// Posiciones en coordenadas de tile: x = columna, y = fila del tile sobre el que se apoya
// (los pies quedan en el borde superior de esa fila). Todo lo de la calle se apoya en la fila 13 (y = 208 px).
//
// Secciones (columnas):
//   A. Inicio (0-15): spawn, vecino, charco P1 (10-12).
//   B. El cable (16-42): carro (16-21), charco P2 (23-38) bajo el arco, banca (27-29, pegada al poste), poste (30),
//      andén (39-42) con la cartelera del paradero (41).
//   C. Charcos en cadena (43-62): P3a-P3d separados por islas secas de 2 tiles (tapa; banca del
//      paradero; matera + tapa), con el techo del paradero encima (ruta alta).
//   D. La tienda (63-79): teléfono y salida.
//
// Métricas (constants.js): salto máximo 61 px (3.8 tiles), velocidad 130 px/s.
//   Subidas: suelo → carro 2 · suelo → andén 1 · andén → cartelera 2 · cartelera → techo 2 (con 1 tile
//   de separación horizontal). Saltos en plano: el más largo es P1 (3 tiles).
//   Bajo el techo del paradero quedan 4 tiles libres: se camina y se suben banca y matera sin pegar la cabeza.
// Alcance del cable (ancla a 12 tiles, ±40°, colisión a lo largo de todo el cable): en el extremo del arco
//   la punta queda a 7.7 tiles del poste y 2.8 tiles sobre el suelo. De pie en el suelo el cable llega
//   hasta 6.6 tiles del poste (a la altura de la cabeza); sobre algo de 1-2 tiles, hasta 7.7 (la punta).
//   Carro y andén quedan 0.8 tiles (13 px) fuera de ese alcance. Detalle en docs/street1_art_brief.md.

export const street_1 = {
  id: 'street_1',
  background: 'street',
  script: 'street_1', // lógica: src/levels/street1Level.js

  layout: [
    '................................................................................', // 0  cielo
    '..............................P.................................................', // 1  punta del poste: ancla del cable (12 tiles sobre el suelo)
    '..............................P.................................................', // 2
    '..............................P.................................................', // 3
    '..............................P.................................................', // 4
    '..............................P.................................................', // 5
    '..............................P.................................................', // 6
    '..............................P.................................................', // 7
    '..............................P............TTTTTTTTTTTTTTTTTTTT.................', // 8  techo del paradero (superficie a 5 tiles)
    '..............................P............|..................|.................', // 9  bajo el techo: 4 tiles libres (filas 9-12)
    '..............................P..........S.|..................|.................', // 10 cartelera S (tope a 3 tiles)
    '................CCCCCC........P..........S.|..................|.................', // 11 carro C (tope a 2 tiles)
    '................CCCCCC.....BBBP........AAAA|........BB...M....|.................', // 12 banca, andén, banca y matera del paradero
    '################################################################################', // 13 suelo (apoyo de todo lo de la calle)
    '################################################################################', // 14
    '################################################################################', // 15
    '################################################################################', // 16 4 filas de suelo: regla de la caja de diálogo
  ],

  spawn: { x: 2, y: 13 },

  npcs: [{ id: 'neighbor', texture: 'npc-neighbor', x: 6, y: 13 }],

  // Cable culebra. `x, y`: ancla (centro de la columna 30, borde superior de la fila 1 = punta del poste).
  // El largo se calcula hasta el suelo, así la punta lo toca justo abajo del todo.
  // `puddle`: charco que electrifica mientras la punta está en la parte baja del arco.
  // Amplitud, periodo y demás en CABLE (constants.js).
  cable: { x: 30, y: 1, puddle: 'P2' },

  // Charcos: `x` = columna izquierda, `w` = ancho en tiles, apoyados en la fila `y`.
  puddles: [
    { id: 'P1', x: 10, y: 13, w: 3 },
    { id: 'P2', x: 23, y: 13, w: 16 },
    { id: 'P3a', x: 43, y: 13, w: 3 },
    { id: 'P3b', x: 48, y: 13, w: 4 },
    { id: 'P3c', x: 54, y: 13, w: 3 },
    { id: 'P3d', x: 59, y: 13, w: 4 },
  ],
  // Conexiones entre charcos (grafo no dirigido): por ahí viaja la corriente. Se dibujan como un
  // chorrito de agua (visual: sin colisión, no mata) que pasa por detrás de los sólidos.
  puddleLinks: [
    ['P1', 'P2'],
    ['P2', 'P3a'],
    ['P3a', 'P3b'],
    ['P3b', 'P3c'],
    ['P3c', 'P3d'],
  ],

  // Tapas de alcantarilla: islas secas planas (solo visuales; no son sólidos ni charcos).
  manholes: [
    { x: 46, y: 13, w: 2 },
    { x: 58, y: 13, w: 1 },
  ],

  // Fachada de la tienda (fondo, sin colisión), en tiles: esquina superior izquierda y tamaño.
  shop: { x: 64, y: 5, w: 11, h: 8 },

  phone: { x: 69, y: 13 },

  // Salida a la derecha, como la puerta de la casa (x = columna izquierda, w x h en tiles).
  // Cerrada (bloquea el paso) hasta cortar la luz (flag powerCut).
  exit: { x: 77, y: 13, w: 2, h: 3 },
};
