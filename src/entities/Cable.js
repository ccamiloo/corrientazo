import { CABLE, COLORS, DEPTH } from '../config/constants.js';

const DEG = Math.PI / 180;

// ¿El segmento (x1,y1)-(x2,y2) toca el rectángulo { left, top, right, bottom }?
// Recorte de Liang-Barsky: el segmento es P(u) = P1 + u·(P2 - P1), u ∈ [0, 1]. Cada lado del rectángulo
// acota el intervalo de u que queda adentro; si al final el intervalo no está vacío, hay contacto.
// Exportada: la usan también los enganches pelados del mercado.
export function segmentHitsRect(x1, y1, x2, y2, r) {
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
//
// Generalizado para otros "cables colgantes" (los hilos de cometa del parque, ver KiteString):
//  - `angleFn(t)` (opcional) reemplaza el péndulo: cualquier función del tiempo en radianes.
//  - `thickness`, `hitMargin` y `color` (opcionales) cambian el dibujo y la colisión.
//  - `sparks: false` no crea chispas (ni el sprite ni el greybox).
// Sin esas opciones se comporta exactamente como el cable de la calle.
export class Cable {
  // `spark` (opcional): { key, anim, deadFrame } del sprite de chispas (props/street_1/cable_spark.png).
  // Sin él (o si la textura no cargó), las chispas son puntitos al azar dibujados con Graphics (greybox).
  constructor(
    scene,
    {
      x,
      y,
      length,
      spark,
      angleFn,
      thickness = CABLE.thicknessPx,
      hitMargin = CABLE.hitMarginPx,
      color = COLORS.cable,
      sparks = true,
    },
  ) {
    this.scene = scene;
    this.ax = x; // ancla, px de mundo
    this.ay = y;
    this.length = length;
    this.amplitude = CABLE.amplitudeDeg * DEG;
    this.angleFn = angleFn ?? ((t) => this.amplitude * Math.sin((2 * Math.PI * t) / CABLE.periodS));
    this.thickness = thickness;
    this.hitMargin = hitMargin;
    this.color = color;
    this.elapsed = 0; // s desde que se armó la sala (reloj propio: avanza con el delta del update)
    this.powered = true;
    this.angle = this.angleFn(0);

    this.gfx = scene.add.graphics().setDepth(DEPTH.props);
    if (!sparks) {
      // Sin chispas (hilos de cometa).
    } else if (spark && scene.textures.exists(spark.key)) {
      // Sprite de 17x17 centrado en la punta: anima 'spark' con luz; sin luz, frame fijo de punta pelada.
      this.spark = scene.add.sprite(x, y + length, spark.key, 0).setOrigin(0.5).setDepth(DEPTH.props + 1);
      this.sparkDeadFrame = spark.deadFrame;
      if (scene.anims.exists(spark.anim)) this.spark.play(spark.anim);
    } else {
      this.sparks = scene.add.graphics().setDepth(DEPTH.props + 1);
    }
  }

  // Ángulo (rad) en el instante t (s): 0 = colgando vertical; positivo = punta a la derecha.
  angleAt(t) {
    return this.angleFn(t);
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
    if (this.spark) this.spark.stop().setFrame(this.sparkDeadFrame);
    else this.sparks?.clear();
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
    const m = this.hitMargin - this.thickness / 2;
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
    this.gfx.lineStyle(this.thickness, this.color).lineBetween(this.ax, this.ay, tip.x, tip.y);

    // Con arte: el sprite de chispas sigue a la punta (con o sin luz; sin luz muestra la punta pelada).
    if (this.spark) {
      this.spark.setPosition(Math.round(tip.x), Math.round(tip.y));
      return;
    }

    // Greybox: puntitos al azar alrededor de la punta, redibujados cada frame (titilan solos).
    if (!this.sparks) return;
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
