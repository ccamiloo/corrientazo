import { MARKET_POWER } from '../config/constants.js';

const CYCLE_S = MARKET_POWER.offS + MARKET_POWER.warnS + MARKET_POWER.onS;

// Reloj eléctrico del mercado, marcado por el congelador del pescado: apagado → aviso → prendido, repetido.
// Charcos, enganches pelados y la lata del mostrador siguen este reloj (el pulpo tiene el suyo).
//
// Como el viento del parque, es una función del tiempo: `phaseAt(t)` sirve para cualquier instante. El reloj es
// propio de la sala y avanza con el delta del update.
export class MarketPower {
  constructor() {
    this.elapsed = 0; // s desde que se armó la sala
    this.phase = 'off'; // 'off' | 'warn' | 'on'
    this.progress = 0; // 0..1 dentro de la fase actual
  }

  // Fase en el instante t (s): { phase, progress, since } (since = s desde que empezó esa fase).
  static phaseAt(t) {
    const u = ((t % CYCLE_S) + CYCLE_S) % CYCLE_S;
    if (u < MARKET_POWER.offS) return { phase: 'off', progress: u / MARKET_POWER.offS, since: u };
    if (u < MARKET_POWER.offS + MARKET_POWER.warnS) {
      const since = u - MARKET_POWER.offS;
      return { phase: 'warn', progress: since / MARKET_POWER.warnS, since };
    }
    const since = u - MARKET_POWER.offS - MARKET_POWER.warnS;
    return { phase: 'on', progress: since / MARKET_POWER.onS, since };
  }

  update(delta) {
    this.elapsed += delta / 1000;
    const { phase, progress } = MarketPower.phaseAt(this.elapsed);
    this.phase = phase;
    this.progress = progress;
  }

  get on() {
    return this.phase === 'on';
  }
}
