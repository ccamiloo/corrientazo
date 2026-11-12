import { PUDDLE, COLORS, DEPTH, TILE } from '../config/constants.js';

// Spritesheet del charco (props/street_1/puddle.png): 4 piezas por fila y una fila por estado.
const PIECE = { left: 0, midA: 1, midB: 2, right: 3 };
const ROW = { off: 0, warn: 1, liveA: 2, liveB: 3 };

// Charcos conectados por los que viaja la corriente.
//
// Un charco es una zona sin colisión sobre el suelo. Estados: 'off' (apagado), 'warn' (titila: se va a
// electrificar dentro de menos de warnS) y 'live' (electrificado: mata al pisarlo).
//
// Cómo se propaga: hay un charco de origen (el que toca el cable) y una función `sourceOn(t)` que dice si
// el origen está electrificado en el instante t. Con un BFS se calcula a cuántas conexiones ("saltos") está
// cada charco del origen; un charco a n saltos está electrificado en t si el origen lo estaba en
// t - n · hopDelayS. Así la corriente avanza como una ola por el grafo, y como sourceOn sirve para
// cualquier t (el cable es determinista), el aviso se calcula mirando hacia adelante.
export class PuddleNetwork {
  // `artKey` (opcional): spritesheet de piezas de 16x7 (props/street_1/puddle.png). Si no está cargado, se
  // dibuja el greybox de antes con Graphics.
  // `stateFn(p, t)` (opcional): reemplaza la propagación por la red; devuelve 'off' | 'warn' | 'live' para cada
  // charco (el mercado: todos se prenden juntos con el congelador). Con stateFn, links y sourceId pueden faltar.
  constructor(scene, { puddles, links = [], sourceId, sourceOn, artKey, stateFn }) {
    this.scene = scene;
    this.sourceOn = sourceOn;
    this.stateFn = stateFn;
    this.powered = true;

    this.puddles = puddles.map((p) => ({
      ...p,
      left: p.x * TILE,
      right: (p.x + p.w) * TILE,
      surface: p.y * TILE,
      hops: Infinity,
      state: 'off',
    }));
    const byId = Object.fromEntries(this.puddles.map((p) => [p.id, p]));
    this.links = links.map(([a, b]) => [byId[a], byId[b]]);

    // BFS desde el origen: hops = número mínimo de conexiones hasta el charco que toca el cable.
    const source = byId[sourceId];
    const queue = source ? [source] : [];
    if (source) source.hops = 0;
    while (queue.length) {
      const cur = queue.shift();
      for (const [a, b] of this.links) {
        const other = a === cur ? b : b === cur ? a : null;
        if (other && other.hops === Infinity) {
          other.hops = cur.hops + 1;
          queue.push(other);
        }
      }
    }

    this.art = artKey && scene.textures.exists(artKey) ? artKey : null;
    if (this.art) {
      // Con arte: el agua va ENCIMA de los tiles (depth tiles + 1), sobre la cara de arriba de la calle.
      // Una pieza por columna en el rango exacto del charco: izquierda, medios alternando a/b, derecha.
      for (const p of this.puddles) {
        p.pieces = [];
        for (let i = 0; i < p.w; i++) {
          const kind = i === 0 ? PIECE.left : i === p.w - 1 ? PIECE.right : i % 2 === 1 ? PIECE.midA : PIECE.midB;
          const img = scene.add
            .image(p.left + i * TILE, p.surface + PUDDLE.pieceOffsetY, this.art, kind)
            .setOrigin(0)
            .setDepth(DEPTH.tiles + 1);
          p.pieces.push({ img, kind });
        }
      }
      this.gfx = scene.add.graphics().setDepth(DEPTH.tiles + 1); // chorritos
    } else {
      // Greybox: detrás de los sólidos (depth tiles - 1), así el agua que pasa "por debajo" del carro, el
      // andén, la banca o la matera queda tapada por ellos sin recortes a mano.
      this.gfx = scene.add.graphics().setDepth(DEPTH.tiles - 1);
    }
  }

  // Estado de un charco en el instante t.
  stateAt(p, t) {
    if (this.stateFn) return this.powered ? this.stateFn(p, t) : 'off';
    if (!this.powered || p.hops === Infinity) return 'off';
    const local = t - p.hops * PUDDLE.hopDelayS; // el instante "del origen" que le llega ahora a este charco
    if (this.sourceOn(local)) return 'live';
    // Aviso: se electrifica en algún momento de los próximos warnS. Se muestrea porque la ventana de
    // electrificación puede ser más corta que warnS.
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      if (this.sourceOn(local + (PUDDLE.warnS * i) / steps)) return 'warn';
    }
    return 'off';
  }

  // Corte de luz: todos apagados para siempre.
  cut() {
    this.powered = false;
  }

  update(t) {
    for (const p of this.puddles) p.state = this.stateAt(p, t);
    this.draw();
  }

  // Charco electrificado que está pisando el jugador (o null). "Pisar" = apoyado en el suelo de la calle
  // y con el hitbox metido más de edgeMarginPx dentro del charco en horizontal.
  liveUnder(body) {
    if (!body.blocked.down) return null;
    for (const p of this.puddles) {
      if (p.state !== 'live') continue;
      if (Math.abs(body.bottom - p.surface) > 1) continue; // está en otra altura (banca, andén, techo)
      if (body.right - PUDDLE.edgeMarginPx > p.left && body.left + PUDDLE.edgeMarginPx < p.right) return p;
    }
    return null;
  }

  draw() {
    if (this.art) this.drawArt();
    else this.drawGreybox();
  }

  // Con arte: cada estado elige una fila del spritesheet. warn alterna warn/off cada flickerMs (titila) y
  // live alterna live_a/live_b cada liveFlickerMs. Los chorritos siguen siendo una línea de 1 px.
  drawArt() {
    const now = this.scene.time.now;
    const blink = Math.floor(now / PUDDLE.flickerMs) % 2 === 0;
    const liveB = Math.floor(now / PUDDLE.liveFlickerMs) % 2 === 1;
    const rowOf = (state) => {
      if (state === 'live') return liveB ? ROW.liveB : ROW.liveA;
      if (state === 'warn') return blink ? ROW.warn : ROW.off;
      return ROW.off;
    };
    for (const p of this.puddles) {
      const row = rowOf(p.state);
      for (const { img, kind } of p.pieces) img.setFrame(row * 4 + kind);
    }

    const g = this.gfx;
    g.clear();
    for (const [a, b] of this.links) {
      const [l, r] = a.left < b.left ? [a, b] : [b, a];
      const far = a.hops > b.hops ? a : b; // el que se electrifica después: así la ola avanza también por aquí
      g.fillStyle(far.state === 'live' ? PUDDLE.streamLive : PUDDLE.streamOff);
      g.fillRect(l.right, l.surface + PUDDLE.streamOffsetY, r.left - l.right, 1);
    }
  }

  // Greybox (sin arte): rectángulos de color.
  drawGreybox() {
    const g = this.gfx;
    const h = PUDDLE.heightPx;
    const flashOn = Math.floor(this.scene.time.now / PUDDLE.flickerMs) % 2 === 0;
    g.clear();

    // Chorritos: línea de 1 px entre charcos conectados, con el color del charco más lejano al origen
    // (el que se electrifica después), así la ola se ve avanzar también por ellos.
    for (const [a, b] of this.links) {
      const [l, r] = a.left < b.left ? [a, b] : [b, a];
      const far = a.hops > b.hops ? a : b;
      g.fillStyle(far.state === 'live' ? COLORS.puddleLive : COLORS.puddle);
      g.fillRect(l.right, l.surface - 1, r.left - l.right, 1);
    }

    for (const p of this.puddles) {
      const w = p.right - p.left;
      const top = p.surface - h;
      if (p.state === 'live') {
        g.fillStyle(COLORS.puddleLive).fillRect(p.left, top, w, h);
        // Zigzag: un pixel negro que sube y baja a lo largo del charco.
        g.fillStyle(COLORS.puddleZigzag);
        for (let x = 0; x < w; x++) {
          const phase = x % 4; // 0,1,2,1 → triángulo de alto 3
          const y = phase === 3 ? 1 : phase;
          g.fillRect(p.left + x, top + y, 1, 1);
        }
      } else {
        g.fillStyle(COLORS.puddle).fillRect(p.left, top, w, h);
        if (p.state === 'warn' && flashOn) {
          // Destellos: puntos claros fijos cada 5 px, alternados con el parpadeo.
          g.fillStyle(COLORS.puddleFlash);
          for (let x = 2; x < w; x += 5) g.fillRect(p.left + x, top + (x % 2), 2, 1);
        }
      }
    }
  }
}
