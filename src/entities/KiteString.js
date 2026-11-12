import { KITE_STRING, COLORS, WIND } from '../config/constants.js';
import { Cable } from './Cable.js';
import { Wind } from '../systems/Wind.js';

const DEG = Math.PI / 180;

// Ángulo de un hilo de cometa en el instante t (rad; negativo = punta hacia la izquierda), según el viento:
//  - calma: vuelve a 0° desde la última ráfaga con un resorte subamortiguado (rebote de ~12° y se calma);
//  - aviso: tiembla ±trembleDeg;
//  - ráfaga: sube hasta gustDeg con un resorte críticamente amortiguado (no se pasa).
// Como depende solo de la fase del viento en t, es una función pura del tiempo (igual que el péndulo del cable).
export function kiteStringAngle(t) {
  const { phase, since } = Wind.phaseAt(t);
  const gust = KITE_STRING.gustDeg * DEG;

  if (phase === 'gust') {
    // Arranca en 0° y quieto: el temblor del aviso hace ciclos enteros, así termina justo en 0°.
    const w = KITE_STRING.riseOmega;
    return gust + (0 - gust) * (1 + w * since) * Math.exp(-w * since);
  }

  // Calma o aviso: tiempo desde que terminó la última ráfaga. En la primera calma de la sala todavía no
  // hubo ráfaga: el hilo cuelga quieto.
  const sinceGustEnd = phase === 'calm' ? since : WIND.calmS + since;
  const hadGust = t - sinceGustEnd > 0;
  let angle = 0;
  if (hadGust) {
    // Resorte con velocidad inicial 0 desde gustDeg: θ = θ1 e^(-ζω0 t) (cos ωd t + ζ/√(1-ζ²) sin ωd t).
    const w0 = (2 * Math.PI) / KITE_STRING.releasePeriodS;
    const z = KITE_STRING.releaseZeta;
    const wd = w0 * Math.sqrt(1 - z * z);
    const s = sinceGustEnd;
    angle = gust * Math.exp(-z * w0 * s) * (Math.cos(wd * s) + (z / Math.sqrt(1 - z * z)) * Math.sin(wd * s));
  }
  if (phase === 'warn') angle += KITE_STRING.trembleDeg * DEG * Math.sin(2 * Math.PI * KITE_STRING.trembleHz * since);
  return angle;
}

// Hilo de cometa enredado en la línea: un Cable con el ángulo del viento, siempre con luz (mata al tocarlo en
// cualquier punto, con la misma colisión segmento-rectángulo), sin chispas, línea blanca de 1 px y moños de cola.
export class KiteString extends Cable {
  constructor(scene, { x, y, length }) {
    super(scene, {
      x,
      y,
      length,
      angleFn: kiteStringAngle,
      thickness: KITE_STRING.thicknessPx,
      hitMargin: KITE_STRING.hitMarginPx,
      color: COLORS.kiteString,
      sparks: false,
    });
  }

  draw() {
    super.draw();
    // Moños de la cola: cada bowEveryPx desde bowStartPx del ancla, una rayita de bowWidthPx perpendicular al
    // hilo (centrada en él), alternando los colores de bowColors.
    const g = this.gfx;
    const sin = Math.sin(this.angle);
    const cos = Math.cos(this.angle);
    const half = (KITE_STRING.bowWidthPx - 1) / 2;
    let i = 0;
    for (let d = KITE_STRING.bowStartPx; d < this.length; d += KITE_STRING.bowEveryPx, i++) {
      const cx = this.ax + d * sin; // punto del hilo
      const cy = this.ay + d * cos;
      g.fillStyle(KITE_STRING.bowColors[i % KITE_STRING.bowColors.length]);
      // Perpendicular al hilo: dirección (cos, -sin). Un pixel por paso, redondeado a la grilla.
      for (let k = -half; k <= half; k++) g.fillRect(Math.round(cx + k * cos), Math.round(cy - k * sin), 1, 1);
    }
  }
}
