import { PULPO, COLORS, DEPTH } from '../config/constants.js';

const CYCLE_S = PULPO.pauseS + PULPO.warnS + PULPO.burstS;
const DEG = Math.PI / 180;
const OFF_FRAME = 5; // frame del arte con el pulpo apagado (donde termina 'smoke')

// El "pulpo": multitoma sobrecargada en el piso del puesto de doña Carmen, con su propio ciclo
// pausa → aviso (se pone rojo y echa humo) → ráfaga de chispas.
//
// En la ráfaga suelta una chispa cada everyS desde la boca (x, y - 8), hacia arriba a la izquierda, con ángulo y
// velocidad al azar; las chispas caen con gravedad y desaparecen al tocar un sólido o el piso. Matan siempre.
// Al bajar el taco (`turnOff`) se apaga del todo: sin ciclo, sin chispas, y suelta un humito que se va.
//
// `isSolidAt(x, y)`: ¿hay un sólido del layout en ese punto? (lo da la sala). `rng`: azar con semilla.
// `art` (opcional): { key, sparkKey } spritesheets del pulpo (32x24, anims idle/warn/burst/smoke) y de la chispa
// (6x6, anim fly). Si no están cargados se dibuja el greybox con Graphics. El arte no cambia la hitbox de 4x4.
export class Pulpo {
  constructor(scene, { x, y, isSolidAt, rng, art }) {
    this.scene = scene;
    this.x = x; // pies (centro abajo), px de mundo
    this.y = y;
    this.mouth = { x, y: y - 8 }; // de donde salen las chispas
    this.isSolidAt = isSolidAt;
    this.rng = rng;
    this.elapsed = 0; // s, reloj propio
    this.phase = 'pause'; // 'pause' | 'warn' | 'burst'
    this.on = true;
    this.sparks = []; // { x, y, vx, vy, sprite? } esquina superior izquierda de la hitbox, px y px/s
    this.spawnClock = 0;
    this.smokeMs = 0;

    const has = (k) => k && scene.textures.exists(k);
    this.sprite = has(art?.key) ? scene.add.sprite(x, y, art.key, 0).setOrigin(0.5, 1).setDepth(DEPTH.props) : null;
    this.artKey = art?.key;
    this.sparkKey = has(art?.sparkKey) ? art.sparkKey : null;
    if (this.sprite) this.playPhase();
    else this.gfx = scene.add.graphics().setDepth(DEPTH.props);
    if (!this.sparkKey) this.sparkGfx = scene.add.graphics().setDepth(DEPTH.props + 1);
  }

  static phaseAt(t) {
    const u = ((t % CYCLE_S) + CYCLE_S) % CYCLE_S;
    if (u < PULPO.pauseS) return 'pause';
    if (u < PULPO.pauseS + PULPO.warnS) return 'warn';
    return 'burst';
  }

  // Con arte: la animación de la fase actual (pausa → 'idle'). No reinicia si ya está sonando.
  playPhase() {
    const key = `${this.artKey}-${this.phase === 'pause' ? 'idle' : this.phase}`;
    if (this.scene.anims.exists(key)) this.sprite.play(key, true);
  }

  // Taco abajo: se apaga del todo. `immediate` al reconstruir la sala con el flag ya puesto (sin humito).
  turnOff(immediate = false) {
    if (!this.on) return;
    this.on = false;
    this.phase = 'pause';
    for (const p of this.sparks) p.sprite?.destroy();
    this.sparks = [];
    this.smokeMs = immediate ? 0 : PULPO.smokeMs;
    if (this.sprite) {
      // 'smoke' termina en el frame apagado; al reconstruir la sala se pone ese frame directo.
      const smoke = `${this.artKey}-smoke`;
      if (!immediate && this.scene.anims.exists(smoke)) this.sprite.play(smoke);
      else this.sprite.stop().setFrame(OFF_FRAME);
    }
  }

  update(delta) {
    const dt = delta / 1000;
    if (this.on) {
      this.elapsed += dt;
      const before = this.phase;
      this.phase = Pulpo.phaseAt(this.elapsed);
      if (this.sprite && this.phase !== before) this.playPhase();
      if (this.phase === 'burst') {
        if (before !== 'burst') this.spawnClock = PULPO.everyS; // la primera sale apenas empieza la ráfaga
        this.spawnClock += dt;
        while (this.spawnClock >= PULPO.everyS) {
          this.spawnClock -= PULPO.everyS;
          const a = this.rng.realInRange(PULPO.angleMinDeg, PULPO.angleMaxDeg) * DEG;
          const v = this.rng.realInRange(PULPO.speedMin, PULPO.speedMax);
          const p = {
            x: this.mouth.x - PULPO.size / 2,
            y: this.mouth.y - PULPO.size / 2,
            vx: v * Math.cos(a),
            vy: -v * Math.sin(a), // y crece hacia abajo
          };
          if (this.sparkKey) {
            p.sprite = this.scene.add.sprite(0, 0, this.sparkKey, 0).setDepth(DEPTH.props + 1);
            const fly = `${this.sparkKey}-fly`;
            if (this.scene.anims.exists(fly)) p.sprite.play(fly);
          }
          this.sparks.push(p);
        }
      }
    }
    // Las chispas siguen volando (aunque termine la ráfaga) hasta tocar un sólido o el piso.
    const s = PULPO.size;
    for (const p of this.sparks) {
      p.vy += PULPO.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.sparks = this.sparks.filter((p) => {
      const alive = !this.isSolidAt(p.x, p.y) && !this.isSolidAt(p.x + s, p.y) && !this.isSolidAt(p.x, p.y + s) && !this.isSolidAt(p.x + s, p.y + s);
      if (!alive) p.sprite?.destroy();
      return alive;
    });
    this.smokeMs = Math.max(0, this.smokeMs - delta);
    this.draw();
  }

  // ¿Alguna chispa toca el rectángulo (hitbox del jugador), recortado `margin` px por lado?
  hits(r, margin) {
    const s = PULPO.size;
    return this.sparks.some((p) => r.right - margin > p.x && r.left + margin < p.x + s && r.bottom - margin > p.y && r.top + margin < p.y + s);
  }

  draw() {
    // Chispas: con arte, el sprite de 6x6 centrado en la hitbox de 4x4 (redondeado para no temblar sub-pixel).
    if (this.sparkKey) {
      const h = PULPO.size / 2;
      for (const p of this.sparks) p.sprite.setPosition(Math.round(p.x + h), Math.round(p.y + h));
    } else {
      this.sparkGfx.clear();
      this.sparkGfx.fillStyle(COLORS.spark);
      for (const p of this.sparks) this.sparkGfx.fillRect(Math.round(p.x), Math.round(p.y), PULPO.size, PULPO.size);
    }
    if (this.sprite) return; // el arte trae la multitoma, el humo y el apagado

    const g = this.gfx;
    const now = this.scene.time.now;
    g.clear();
    // Multitoma (greybox): caja de 28x8 con 5 enchufes y cables que salen hacia la derecha.
    const left = this.x - 14;
    const top = this.y - 8;
    const hot = this.on && this.phase !== 'pause';
    g.fillStyle(hot ? 0xff2a1a : COLORS.pulpo).fillRect(left, top, 28, 8);
    g.fillStyle(0x1b1b1b);
    for (let i = 0; i < 5; i++) g.fillRect(left + 3 + i * 5, top + 2, 2, 3);
    g.lineStyle(1, COLORS.dirtyCable);
    for (let i = 0; i < 5; i++) g.lineBetween(left + 4 + i * 5, top, left + 30 + i * 4, top - 6 - i * 2);
    // Humo: en el aviso (y en la ráfaga) bolitas grises que suben; al apagarlo, un humito que se desvanece.
    const smoking = this.on && this.phase !== 'pause';
    const fade = this.smokeMs / PULPO.smokeMs;
    if (smoking || fade > 0) {
      const alpha = smoking ? 0.7 : 0.6 * fade;
      g.fillStyle(COLORS.smoke, alpha);
      for (let i = 0; i < 3; i++) {
        const k = ((now / 600 + i / 3) % 1); // 0..1, sube y se abre
        g.fillCircle(this.x - 4 + i * 4, top - 4 - k * 18, 2 + k * 3);
      }
    }
  }
}
