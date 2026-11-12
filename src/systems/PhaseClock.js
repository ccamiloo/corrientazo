// Reloj cíclico de fases con duración fija: p. ej. [['off', 2.0], ['warn', 0.45], ['on', 1.4]].
//
// Igual que MarketPower o el viento: la fase es una función del tiempo (`phaseAt(t)` sirve para cualquier
// instante, también el futuro), y el reloj es propio de quien lo usa y avanza con el delta del update (no con
// tweens, que van en tiempo real y no siguen a __game.step en las pruebas).
export class PhaseClock {
  // `phases`: lista de [nombre, segundos]. `offsetS` desfasa el reloj (empieza como si ya hubiera corrido).
  constructor(phases, offsetS = 0) {
    this.phases = phases;
    this.period = phases.reduce((sum, [, s]) => sum + s, 0);
    this.elapsed = offsetS;
    this.update(0);
  }

  // Fase en el instante t (s): { phase, progress (0..1 dentro de la fase), since (s desde que empezó) }.
  phaseAt(t) {
    let u = ((t % this.period) + this.period) % this.period;
    for (const [phase, s] of this.phases) {
      if (u < s) return { phase, progress: u / s, since: u };
      u -= s;
    }
    // Solo por redondeo: u quedó justo en el periodo.
    const [phase] = this.phases[this.phases.length - 1];
    return { phase, progress: 1, since: this.phases[this.phases.length - 1][1] };
  }

  update(delta) {
    this.elapsed += delta / 1000;
    const { phase, progress, since } = this.phaseAt(this.elapsed);
    this.phase = phase;
    this.progress = progress;
    this.since = since;
  }
}
