import * as Phaser from 'phaser';
import { WIND, COLORS, DEPTH, GAME_W, GAME_H } from '../config/constants.js';

const CYCLE_S = WIND.calmS + WIND.warnS + WIND.gustS;

// Viento del parque: ciclo calma → aviso → ráfaga, repetido. Sopla hacia la izquierda.
//
// Es una función del tiempo (como el cable de la calle): `phaseAt(t)` dice la fase en cualquier instante,
// así que todo lo que depende del viento (hilos de cometa, chispas del árbol) se puede calcular sin integrar.
// El reloj es propio de la sala: avanza con el delta del update (no con tweens, que usan tiempo real).
export class Wind {
  constructor() {
    this.elapsed = 0; // s desde que se armó la sala
    this.phase = 'calm'; // 'calm' | 'warn' | 'gust'
    this.progress = 0; // 0..1 dentro de la fase actual
    this.gustStarted = false; // true solo en el frame en que empezó una ráfaga
  }

  // Fase en el instante t (s): { phase, progress, since } (since = s desde que empezó esa fase).
  static phaseAt(t) {
    const u = ((t % CYCLE_S) + CYCLE_S) % CYCLE_S;
    if (u < WIND.calmS) return { phase: 'calm', progress: u / WIND.calmS, since: u };
    if (u < WIND.calmS + WIND.warnS) {
      const since = u - WIND.calmS;
      return { phase: 'warn', progress: since / WIND.warnS, since };
    }
    const since = u - WIND.calmS - WIND.warnS;
    return { phase: 'gust', progress: since / WIND.gustS, since };
  }

  update(delta) {
    const before = this.phase;
    this.elapsed += delta / 1000;
    const { phase, progress } = Wind.phaseAt(this.elapsed);
    this.phase = phase;
    this.progress = progress;
    this.gustStarted = phase === 'gust' && before !== 'gust';
  }

  // Empuje horizontal para el jugador cuando está en el aire (px/s); 0 fuera de la ráfaga.
  get airPushX() {
    return this.phase === 'gust' ? WIND.airPushX : 0;
  }
}

// Efectos visuales del viento: rayitas que cruzan la pantalla de derecha a izquierda y las mangas de viento.
// Mangas con arte (`sockKey`, windsock de 24x24): un par de frames por fase alternados cada sockFlapMs para que
// ondee, con el pixel (21, 2) en el amarre. Sin arte (greybox): un trapecio que se levanta hacia la izquierda en
// el aviso y queda horizontal en la ráfaga.
export class WindFx {
  // `socks`: puntos de amarre de las mangas (px de mundo: punta de cada asta 'W').
  constructor(scene, wind, socks, rng, sockKey) {
    this.scene = scene;
    this.wind = wind;
    this.rng = rng;
    this.socks = socks.map((s) => ({ ...s, angle: 0 }));
    this.streaks = [];
    this.spawnDebt = 0;
    if (sockKey && scene.textures.exists(sockKey)) {
      for (const s of this.socks) {
        s.sprite = scene.add.sprite(s.x, s.y, sockKey, 0).setOrigin(21 / 24, 2 / 24).setDepth(DEPTH.tiles - 1);
      }
    } else {
      this.sockGfx = scene.add.graphics().setDepth(DEPTH.tiles - 1);
    }
    // Las rayitas van fijas a la pantalla, por encima del mundo y debajo de la interfaz.
    this.streakGfx = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.ui - 2);
  }

  update(delta) {
    const dt = delta / 1000;
    const { phase } = this.wind;

    // Rayitas: se crean a la tasa de la fase (acumulando fracciones) y se mueven a velocidad fija.
    this.spawnDebt += WIND.streaksPerS[phase] * dt;
    while (this.spawnDebt >= 1) {
      this.spawnDebt -= 1;
      this.streaks.push({
        x: GAME_W + this.rng.between(0, 40),
        y: this.rng.between(10, GAME_H - 70),
        len: this.rng.between(6, 18),
      });
    }
    for (const s of this.streaks) s.x -= WIND.streakSpeed * dt;
    this.streaks = this.streaks.filter((s) => s.x + s.len > 0);

    // Mangas: el ángulo se acerca al de la fase (un poco de inercia para que no salten).
    const target = WIND.sockLiftDeg[phase];
    for (const s of this.socks) s.angle += (target - s.angle) * Math.min(1, dt * 6);

    this.draw();
  }

  draw() {
    const g = this.streakGfx;
    g.clear();
    g.fillStyle(COLORS.windStreak, 0.8);
    for (const s of this.streaks) g.fillRect(Math.round(s.x), s.y, s.len, 1);

    // Con arte: frame del par de la fase, alternado cada sockFlapMs (reloj de la sala, así ondea igual en pruebas).
    if (!this.sockGfx) {
      const flap = Math.floor((this.wind.elapsed * 1000) / WIND.sockFlapMs) % 2;
      const frame = WIND.sockFrames[this.wind.phase][flap];
      for (const s of this.socks) s.sprite.setFrame(frame);
      return;
    }

    // Greybox: trapecio de 14 px que cuelga del amarre; con ángulo a apunta hacia la izquierda (el viento la estira).
    const m = this.sockGfx;
    m.clear();
    for (const s of this.socks) {
      const a = Phaser.Math.DegToRad(s.angle);
      const dir = { x: -Math.sin(a), y: Math.cos(a) }; // a = 0: hacia abajo; a = 90°: hacia la izquierda
      const nrm = { x: dir.y, y: -dir.x };
      const p = (along, side) => ({ x: s.x + dir.x * along + nrm.x * side, y: s.y + dir.y * along + nrm.y * side });
      const pts = [p(0, 3), p(14, 1.5), p(14, -1.5), p(0, -3)];
      m.fillStyle(COLORS.sock).fillPoints(pts, true);
    }
  }
}
