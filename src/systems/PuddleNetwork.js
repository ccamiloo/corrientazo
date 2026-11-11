import { PUDDLE, COLORS, DEPTH, TILE } from '../config/constants.js';

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
  constructor(scene, { puddles, links, sourceId, sourceOn }) {
    this.scene = scene;
    this.sourceOn = sourceOn;
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
    source.hops = 0;
    const queue = [source];
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

    // Detrás de los sólidos (depth tiles - 1): el agua que pasa "por debajo" del carro, el andén, la
    // banca o la matera queda tapada por ellos sin recortes a mano.
    this.gfx = scene.add.graphics().setDepth(DEPTH.tiles - 1);
  }

  // Estado de un charco en el instante t.
  stateAt(p, t) {
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
