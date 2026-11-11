import { CABLE, COLORS, DEPTH } from '../config/constants.js';

const DEG = Math.PI / 180;

// ¿El segmento (x1,y1)-(x2,y2) toca el rectángulo { left, top, right, bottom }?
// Recorte de Liang-Barsky: el segmento es P(u) = P1 + u·(P2 - P1), u ∈ [0, 1]. Cada lado del rectángulo
// acota el intervalo de u que queda adentro; si al final el intervalo no está vacío, hay contacto.
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let u0 = 0;
  let u1 = 1;
  // Para cada lado: p = componente de la dirección hacia afuera, q = distancia del punto inicial a ese lado.
  const sides = [
    [-dx, x1 - r.left],
    [dx, r.right - x1],
    [-dy, y1 - r.top],
    [dy, r.bottom - y1],
  ];
  for (const [p, q] of sides) {
    if (p === 0) {
      if (q < 0) return false; // paralelo a este lado y por fuera
      continue;
    }
    const u = q / p;
    if (p < 0) u0 = Math.max(u0, u); // entrando
    else u1 = Math.min(u1, u); // saliendo
    if (u0 > u1) return false;
  }
  return true;
}

// Cable culebra: péndulo rígido anclado a la punta del poste.
// No usa física de Arcade (los bodies de Arcade son rectángulos alineados a los ejes y el cable es una
// línea inclinada); el contacto se calcula a mano contra todo el largo del cable.
// El ángulo es una función del tiempo (no se integra), así que se puede preguntar por el futuro
// (`angleAt`): lo usan los charcos para avisar antes de electrificarse.
export class Cable {
  constructor(scene, { x, y, length }) {
    this.scene = scene;
    this.ax = x; // ancla, px de mundo
    this.ay = y;
    this.length = length;
    this.amplitude = CABLE.amplitudeDeg * DEG;
    this.elapsed = 0; // s desde que se armó la sala (reloj propio: avanza con el delta del update)
    this.powered = true;
    this.angle = 0;

    this.gfx = scene.add.graphics().setDepth(DEPTH.props);
    this.sparks = scene.add.graphics().setDepth(DEPTH.props + 1);
  }

  // Ángulo (rad) en el instante t (s): 0 = colgando vertical; positivo = punta a la derecha.
  angleAt(t) {
    return this.amplitude * Math.sin((2 * Math.PI * t) / CABLE.periodS);
  }

  tipAt(angle) {
    return { x: this.ax + this.length * Math.sin(angle), y: this.ay + this.length * Math.cos(angle) };
  }

  // ¿La punta está en la parte baja del arco en el instante t? (con luz)
  isLowAt(t) {
    return this.powered && Math.abs(this.angleAt(t)) <= CABLE.lowArcDeg * DEG;
  }

  // Corte de luz: deja de oscilar y queda colgando quieto (vertical), sin chispas ni peligro.
  cut(immediate = false) {
    if (!this.powered) return;
    this.powered = false;
    this.sparks.clear();
    // Asentamiento: el ángulo va de donde estaba a 0 en settleMs. Se calcula en update con el mismo reloj que
    // la oscilación (y no con un tween) para que todo el cable dependa de un solo tiempo.
    this.settleFrom = immediate ? 0 : this.angle;
    this.settleElapsed = 0; // ms desde el corte
    if (immediate) this.angle = 0;
  }

  // ¿Toca el rectángulo (hitbox del jugador)? Solo con luz. El rectángulo se recorta hitMarginPx por lado
  // y se agranda medio grosor del cable (así se compara contra una línea sin grosor).
  hits(rect) {
    if (!this.powered) return false;
    const m = CABLE.hitMarginPx - CABLE.thicknessPx / 2;
    const tip = this.tipAt(this.angle);
    return segmentHitsRect(this.ax, this.ay, tip.x, tip.y, {
      left: rect.left + m,
      right: rect.right - m,
      top: rect.top + m,
      bottom: rect.bottom - m,
    });
  }

  update(delta) {
    this.elapsed += delta / 1000;
    if (this.powered) {
      this.angle = this.angleAt(this.elapsed);
    } else if (this.angle !== 0) {
      this.settleElapsed += delta;
      const k = Math.min(1, this.settleElapsed / CABLE.settleMs);
      this.angle = this.settleFrom * (1 - Math.sin((k * Math.PI) / 2)); // ease-out: frena al llegar
    }
    this.draw();
  }

  draw() {
    const tip = this.tipAt(this.angle);
    this.gfx.clear();
    this.gfx.lineStyle(CABLE.thicknessPx, COLORS.cable).lineBetween(this.ax, this.ay, tip.x, tip.y);

    // Chispas: puntitos al azar alrededor de la punta, redibujados cada frame (titilan solos).
    this.sparks.clear();
    if (!this.powered) return;
    this.sparks.fillStyle(COLORS.spark);
    for (let i = 0; i < CABLE.sparkCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * CABLE.sparkRadiusPx;
      const size = Math.random() < 0.3 ? 2 : 1;
      this.sparks.fillRect(Math.round(tip.x + Math.cos(a) * r), Math.round(tip.y + Math.sin(a) * r) - 1, size, size);
    }
  }
}
