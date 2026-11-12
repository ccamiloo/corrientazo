import { TILE, DEPTH } from '../config/constants.js';

// Convierte el layout de strings de una habitación en:
//  - imágenes de tile (solo visual, una por celda), y
//  - cuerpos estáticos de física, fusionados en rectángulos grandes.
//
// ¿Por qué fusionar? Si cada tile tuviera su propio body, el jugador podría "engancharse" en las
// uniones internas entre bodies vecinos (por ejemplo, al deslizarse pegado a una pared hecha de
// muchos tiles apilados). Con un rectángulo por bloque continuo no hay uniones internas, y además
// hay muchos menos bodies que revisar.

// Leyenda del layout. Sólidos: tienen colisión y se fusionan entre sí sin importar el carácter.
// Los demás caracteres visuales se dibujan pero no colisionan. '.' es vacío.
// Casa: '#' estructura, 'E' escalón, 'T' techo. Calle: 'C' carro, 'B' banca, 'A' andén,
// 'S' cartelera del paradero, 'M' matera ('T' es el techo del paradero). Decoraciones: '|' columna, 'P' poste.
const SOLID_TILES = {
  '#': 'tile',
  E: 'tile-step',
  T: 'tile-roof',
  C: 'tile-car',
  B: 'tile-bench',
  A: 'tile-curb',
  S: 'tile-stop-sign',
  M: 'tile-planter',
};
const DECOR_TILES = { '|': 'column', P: 'pole' };

// Leyenda efectiva de una sala: la global más lo que la sala redefina en `legend`
// ({ carácter: { texture, solid } }). Hace falta porque un mismo carácter puede significar cosas distintas:
// en el parque 'T' es el tronco del árbol (decorativo), no un techo sólido.
export function legendOf(room) {
  const solid = { ...SOLID_TILES };
  const decor = { ...DECOR_TILES };
  for (const [ch, def] of Object.entries(room.legend ?? {})) {
    delete solid[ch];
    delete decor[ch];
    (def.solid ? solid : decor)[ch] = def.texture;
  }
  return { solid, decor, isSolid: (ch) => ch in solid };
}

export function roomSize(room) {
  return { cols: room.layout[0].length, rows: room.layout.length };
}

export function buildRoom(scene, room) {
  const { layout } = room;
  const { cols, rows } = roomSize(room);
  const { solid, decor, isSolid } = legendOf(room);

  // 1) Visual
  // Si la sala trae su estructura dibujada como una sola imagen (art.tiles), se usa esa y no se dibuja
  // tile por tile (ni las decoraciones como las columnas, que ya vienen en el arte). La colisión no cambia.
  const tilesKey = `${room.id}-tiles`;
  const tilesArt = room.art?.tiles && scene.textures.exists(tilesKey);
  if (tilesArt) scene.add.image(0, 0, tilesKey).setOrigin(0).setDepth(DEPTH.tiles);
  for (let r = 0; r < rows && !tilesArt; r++) {
    for (let c = 0; c < cols; c++) {
      const ch = layout[r][c];
      const key = solid[ch] ?? decor[ch];
      if (!key) continue;
      // Las decoraciones van detrás de los tiles sólidos (una columna no tapa el techo que sostiene).
      const depth = ch in solid ? DEPTH.tiles : DEPTH.tiles - 1;
      scene.add.image(c * TILE, r * TILE, key).setOrigin(0).setDepth(depth);
    }
  }

  // 2) Física: tramos horizontales por fila...
  const rects = [];
  let open = new Map(); // "cIni-cFin" -> rect que viene de la fila anterior con el mismo tramo
  for (let r = 0; r < rows; r++) {
    const next = new Map();
    let c = 0;
    while (c < cols) {
      if (!isSolid(layout[r][c])) {
        c++;
        continue;
      }
      const start = c;
      while (c < cols && isSolid(layout[r][c])) c++;
      const key = `${start}-${c}`;
      // ...y si la fila anterior tenía exactamente el mismo tramo, lo estiramos hacia abajo.
      const prev = open.get(key);
      if (prev) {
        prev.h += 1;
        next.set(key, prev);
      } else {
        const rect = { c: start, r, w: c - start, h: 1 };
        rects.push(rect);
        next.set(key, rect);
      }
    }
    open = next;
  }

  const solids = scene.physics.add.staticGroup();
  for (const { c, r, w, h } of rects) {
    // Zone = objeto invisible con tamaño; ideal como collider sin dibujo.
    const zone = scene.add.zone(c * TILE, r * TILE, w * TILE, h * TILE).setOrigin(0);
    solids.add(zone);
  }
  // Los bodies estáticos toman posición y tamaño del objeto al agregarse; refresh por si acaso.
  solids.refresh();

  return { solids, width: cols * TILE, height: rows * TILE };
}

// Altura (px de mundo) de la superficie del suelo de la sala.
// Suelo = el bloque de filas 100% sólidas pegado al fondo del layout; su superficie es el borde superior
// de la más alta de esas filas. Si la última fila no es completa (sala con fosos), no hay un suelo
// continuo que detectar y usamos el punto de apoyo del spawn como referencia.
export function findGroundY(room) {
  const { layout } = room;
  const { isSolid } = legendOf(room);
  let r = layout.length;
  while (r > 0 && [...layout[r - 1]].every(isSolid)) r--;
  if (r === layout.length) return tileToFeet(room.spawn).y;
  return r * TILE;
}

// Coordenadas de tile (columna, fila de apoyo) → px del punto de apoyo (centro en X, borde superior de la fila).
export function tileToFeet({ x, y }) {
  return { x: x * TILE + TILE / 2, y: y * TILE };
}
