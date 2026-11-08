import { TILE, DEPTH } from '../config/constants.js';

// Convierte el layout de strings de una habitación en:
//  - imágenes de tile (solo visual, una por celda), y
//  - cuerpos estáticos de física, fusionados en rectángulos grandes.
//
// ¿Por qué fusionar? Si cada tile tuviera su propio body, el jugador podría "engancharse" en las
// uniones internas entre bodies vecinos (por ejemplo, al deslizarse pegado a una pared hecha de
// muchos tiles apilados). Con un rectángulo por bloque continuo no hay uniones internas, y además
// hay muchos menos bodies que revisar.

export function roomSize(room) {
  return { cols: room.layout[0].length, rows: room.layout.length };
}

export function buildRoom(scene, room) {
  const { layout } = room;
  const { cols, rows } = roomSize(room);

  // 1) Visual
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (layout[r][c] === '#') {
        scene.add.image(c * TILE, r * TILE, 'tile').setOrigin(0).setDepth(DEPTH.tiles);
      }
    }
  }

  // 2) Física: tramos horizontales por fila...
  const rects = [];
  let open = new Map(); // "cIni-cFin" -> rect que viene de la fila anterior con el mismo tramo
  for (let r = 0; r < rows; r++) {
    const next = new Map();
    let c = 0;
    while (c < cols) {
      if (layout[r][c] !== '#') {
        c++;
        continue;
      }
      const start = c;
      while (c < cols && layout[r][c] === '#') c++;
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

// Coordenadas de tile (columna, fila de apoyo) → px del punto de apoyo (centro en X, borde superior de la fila).
export function tileToFeet({ x, y }) {
  return { x: x * TILE + TILE / 2, y: y * TILE };
}
