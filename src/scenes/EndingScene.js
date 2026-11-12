import * as Phaser from 'phaser';
import { GAME_W, ANIM, UI, ENDING as E } from '../config/constants.js';
import { CHARACTERS, animKey, genderize } from '../data/characters.js';
import { npcAnimKey } from '../data/npcs.js';
import { endingDialogs as D } from '../data/dialogs/ending.js';
import { formatTimeShort } from '../systems/PlayTimer.js';
import { Music } from '../systems/Music.js';
import { pixelText } from '../systems/pixelText.js';
import { Device } from '../systems/Device.js';

// Capas de abajo hacia arriba.
const LAYER = { bg: 0, tick: 1, seno: 2, counter: 3, tray: 4, food: 5, steam: 6, player: 7, bubble: 8, title: 9, confetti: 10, receipt: 11, stamp: 12, hint: 13 };
const PLATES = 5; // sopa, patacón, seco, jugo, postre (orden de end_food.png y del tablero)

// Escena final en el restaurante de la Seño (public/assets/ui/ending/README.txt). No cuenta en el tiempo: el
// PlayTimer ya lo paró goToResults, que también fijó los datos de la partida (score) y la key del envío.
// Fases, encadenadas con timers y tweens del reloj de la escena:
//   1. Llegada: el jugador entra caminando.          (0 → serveAt)
//   2. La Seño habla y sirve los 5 platos.            (serveAt → partyAt)
//   3. ¡CORRIENTAZO!: título, cinta, festejo, confeti. (partyAt → billAt)
//   4. La cuenta: recibo, sello PAGADO y aviso.        (desde billAt)
// Cualquier tecla en las fases 1-3 salta a la 4 con todo ya servido; en la 4, lleva a la tabla de tiempos.
export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  init(data) {
    this.score = data.score;
    this.key = data.key;
    this.phase = 1;
    this.confetti = [];
  }

  create() {
    Music.play(this, 'menus'); // no hay pista alegre propia todavía
    this.character = CHARACTERS.find((c) => c.texture === this.score.character) ?? CHARACTERS[0];
    this.cameras.main.fadeIn(E.fadeMs, 0, 0, 0);

    this.add.image(0, 0, 'end-bg').setOrigin(0).setDepth(LAYER.bg);
    // Chulitos del tablero (vacíos hasta que llega cada plato).
    this.ticks = Array.from({ length: PLATES }, (_, i) =>
      this.add.image(E.tick.x, E.tick.y + i * E.tick.dy, 'end-tick').setOrigin(0).setDepth(LAYER.tick).setAlpha(0),
    );

    // La Seño detrás del mostrador, mirando a la izquierda (el arte mira a la derecha).
    const seno = this.textures.exists('seno') ? 'seno' : 'npc';
    this.seno = this.add.sprite(E.seno.x, E.seno.feetY, seno, 0).setOrigin(0.5, 1).setScale(2).setFlipX(true).setDepth(LAYER.seno);
    this.senoAnim('idle');
    this.add.image(0, 0, 'end-counter').setOrigin(0).setDepth(LAYER.counter);
    this.add.image(E.tray.x, E.tray.y, 'end-tray').setOrigin(0).setScale(2).setDepth(LAYER.tray);

    // Platos: origen al centro para que el "pop" crezca desde el medio (la esquina del README + medio frame a x2).
    this.food = Array.from({ length: PLATES }, (_, i) =>
      this.add
        .image(E.food.x + i * E.food.dx + 16, E.food.y + 12, 'end-food', i)
        .setScale(2)
        .setDepth(LAYER.food)
        .setVisible(false),
    );
    this.steam = this.add.sprite(E.steam.x, E.steam.y, 'end-steam', 0).setOrigin(0).setScale(2).setDepth(LAYER.steam).setVisible(false);

    // El jugador, con su spritesheet a escala 2.
    const c = this.character;
    this.player = this.add
      .sprite(E.player.fromX, E.player.feetY, c.texture, c.sheet ? 0 : undefined)
      .setOrigin(0.5, 1)
      .setScale(2)
      .setDepth(LAYER.player);

    this.createBubble();
    this.title = this.add.sprite(E.title.x, E.title.fromY, 'end-title', 0).setOrigin(0).setDepth(LAYER.title).setVisible(false);
    this.banner = this.add.image(E.banner.cx, E.banner.y, 'end-banner').setOrigin(0.5, 0).setDepth(LAYER.title).setScale(0, 1).setVisible(false);
    this.createReceipt();
    // Sello: origen al centro para que "golpee" desde el medio (esquina del README + medio tamaño).
    this.stamp = this.add.image(E.stamp.x + 43, E.stamp.y + 26, 'end-stamp').setDepth(LAYER.stamp).setVisible(false);
    this.hint = this.add.sprite(E.hint.x, E.hint.y, 'end-hint', 0).setOrigin(0).setDepth(LAYER.hint).setVisible(false);
    // Táctil: end_hint_touch (más angosta), centrada donde va la de teclado. Cambia sola si cambia el modo.
    const hintLook = () => {
      const touch = Device.isTouch && this.textures.exists('end-hint-touch');
      this.hint.setTexture(touch ? 'end-hint-touch' : 'end-hint', this.hint.frame.name);
      this.hint.x = touch ? E.hint.x + Math.round((196 - 165) / 2) : E.hint.x;
    };
    hintLook();
    Device.onChangeWhile(this, hintLook);

    // Teclado. Los eventos repetidos de la cola de Phaser (ver NameEntryScene) se ignoran.
    this.seen = new WeakSet();
    const next = () => {
      if (this.phase < 4) this.skip();
      else if (this.time.now >= this.acceptAt) this.scene.start('Leaderboard', { mode: 'result', score: this.score, key: this.key });
    };
    this.input.keyboard.on('keydown', (event) => {
      if (this.seen.has(event) || event.repeat) return;
      this.seen.add(event);
      next();
    });
    // Un toque (o clic) en cualquier parte hace lo mismo que una tecla.
    this.input.on('pointerdown', next);

    this.arrive();
    this.time.delayedCall(E.serveAt, () => this.serve());
    this.time.delayedCall(E.partyAt, () => this.party());
    this.time.delayedCall(E.billAt, () => this.bill());
  }

  senoAnim(name) {
    const key = npcAnimKey('seno', name);
    if (this.anims.exists(key)) this.seno.play(key, true);
  }

  playerAnim(name) {
    const key = animKey(this.character.texture, name);
    if (this.anims.exists(key)) this.player.play(key, true);
  }

  // Burbuja de la Seño: caja clara con borde y colita hacia su cabeza, con el texto ya con su género.
  createBubble() {
    const b = E.bubble;
    const text = pixelText(this, 0, 0, genderize(D.seno, this.character.gender), {
      color: E.receiptText.color,
      outline: false,
      maxWidth: b.maxWidth,
      align: 1,
      origin: [0.5, 1],
    });
    const w = Math.ceil(text.textWidth) + b.padX * 2;
    const h = Math.ceil(text.textHeight) + b.padY * 2;
    const g = this.add.graphics();
    g.fillStyle(UI.outline).fillRect(-w / 2 - 1, -h - 1, w + 2, h + 2); // borde de 1 px
    g.fillStyle(b.fill).fillRect(-w / 2, -h, w, h);
    g.fillStyle(UI.outline).fillTriangle(-4, 0, 4, 0, 0, 6); // colita
    g.fillStyle(b.fill).fillTriangle(-3, -1, 3, -1, 0, 4);
    text.setPosition(0, -b.padY);
    this.bubble = this.add.container(b.cx, b.bottom, [g, text]).setDepth(LAYER.bubble).setVisible(false);
  }

  // Recibo: imagen + nombre, tiempo y muertes, todo en un contenedor que entra desde la derecha.
  createReceipt() {
    const r = E.receipt;
    const t = E.receiptText;
    const s = this.score;
    const ink = { color: t.color, outline: false };
    this.receipt = this.add.container(r.fromX, r.y).setDepth(LAYER.receipt).setVisible(false);
    // Coordenadas del README (pantalla) → relativas a la esquina final del recibo.
    let name = pixelText(this, t.name.x - r.x, t.name.y - r.y, s.name, { ...ink, scale: 2 });
    // Un nombre de 12 letras anchas no cabe a escala 2 en el recibo (124 px útiles): escala 1, centrado en la línea.
    if (name.textWidth > t.right - t.name.x) {
      name.destroy();
      name = pixelText(this, t.name.x - r.x, t.name.y - r.y + 6, s.name, ink);
    }
    this.receipt.add([
      this.add.image(0, 0, 'end-receipt').setOrigin(0),
      name,
      pixelText(this, t.right - r.x, t.timeY - r.y, formatTimeShort(s.timeMs), { ...ink, origin: [1, 0] }),
      pixelText(this, t.right - r.x, t.deathsY - r.y, String(s.deaths), { ...ink, origin: [1, 0] }),
    ]);
  }

  // --- Fase 1: llegada ---
  arrive() {
    const p = E.player;
    // Ritmo de la caminata como en el juego: a escala 2, cada px de pantalla son 0.5 px del personaje.
    const speed = (p.toX - p.fromX) / (p.walkMs / 1000) / 2;
    const walk = this.anims.get(animKey(this.character.texture, 'walk'));
    this.playerAnim('walk');
    if (walk) this.player.anims.timeScale = (speed * 4) / ANIM.walkPxPerCycle / walk.frameRate;
    this.tweens.add({
      targets: this.player,
      x: p.toX,
      duration: p.walkMs,
      onComplete: () => {
        this.player.anims.timeScale = 1;
        this.playerAnim('idle');
      },
    });
  }

  // --- Fase 2: la Seño habla y sirve ---
  serve() {
    this.phase = 2;
    this.senoAnim('talk');
    this.bubble.setVisible(true).setScale(0.5);
    this.tweens.add({ targets: this.bubble, scale: 1, duration: 120, ease: 'Back.easeOut' });
    this.time.delayedCall(E.platesAt - E.serveAt, () => {
      this.senoAnim('serve');
      for (let i = 0; i < PLATES; i++) this.time.delayedCall(i * E.plateEveryMs, () => this.servePlate(i));
    });
  }

  servePlate(i) {
    const plate = this.food[i].setVisible(true).setScale(2 * E.food.popFrom);
    this.tweens.add({ targets: plate, scale: 2, duration: E.food.popMs, ease: 'Back.easeOut' });
    const tick = this.ticks[i].setScale(1.6);
    this.tweens.add({ targets: tick, alpha: 1, scale: 1, duration: E.tick.popMs, ease: 'Back.easeOut' });
    if (i === 0) this.startSteam(); // con la sopa arranca el vapor
    // TODO: un 'ding' por plato cuando haya efectos de sonido.
  }

  startSteam() {
    this.steam.setVisible(true);
    if (this.anims.exists('end-steam')) this.steam.play('end-steam', true);
  }

  // --- Fase 3: ¡CORRIENTAZO! ---
  party() {
    this.phase = 3;
    this.bubble.setVisible(false);
    this.cameras.main.flash(E.flashMs, 255, 255, 255);

    this.title.setVisible(true);
    if (this.anims.exists('end-title-wave')) this.title.play('end-title-wave');
    this.tweens.add({
      targets: this.title,
      y: E.title.y,
      duration: E.title.dropMs,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.banner.setVisible(true);
        this.tweens.add({ targets: this.banner, scaleX: 1, duration: E.banner.growMs, ease: 'Back.easeOut' });
      },
    });

    this.startCheer();
    this.playerHops();
    this.startConfetti();
  }

  // La Seño alterna los brazos (serve ↔ cheer) con un saltito cada vez que los sube.
  startCheer() {
    this.seno.stop();
    let up = false;
    this.time.addEvent({
      delay: E.cheerStepMs,
      loop: true,
      callback: () => {
        up = !up;
        this.seno.setFrame(up ? 5 : 4);
        if (up) this.tweens.add({ targets: this.seno, y: E.seno.feetY - E.cheerHopPx, duration: E.cheerStepMs / 2, yoyo: true, ease: 'Quad.easeOut' });
      },
    });
  }

  // El jugador salta en su sitio: sube con la anim de salto, baja con la de caída y, al aterrizar, encadena el
  // siguiente salto (si se lanzaran con timers, el aterrizaje de uno pisaría la anim del que empieza).
  playerHops(left = E.playerHops) {
    if (left <= 0) return this.playerAnim('idle');
    const half = E.playerHopMs / 2;
    this.playerAnim('jump');
    this.tweens.add({
      targets: this.player,
      y: E.player.feetY - E.playerHopPx,
      duration: half,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.playerAnim('fall');
        this.tweens.add({
          targets: this.player,
          y: E.player.feetY,
          duration: half,
          ease: 'Quad.easeIn',
          onComplete: () => this.playerHops(left - 1),
        });
      },
    });
  }

  // Confeti: `count` papelitos repartidos en `emitMs`, que caen desde arriba girando y con vaivén (ver update).
  startConfetti() {
    const c = E.confetti;
    const rnd = Phaser.Math.FloatBetween;
    // En el celular, la mitad de papelitos (rendimiento en gamas medias).
    const count = Device.isTouch ? Math.ceil(c.count / 2) : c.count;
    this.time.addEvent({
      delay: c.emitMs / count,
      repeat: count - 1,
      callback: () => {
        const sprite = this.add
          .sprite(rnd(0, GAME_W), rnd(-24, -8), 'end-confetti', Phaser.Math.Between(0, 7))
          .setScale(2)
          .setDepth(LAYER.confetti);
        this.confetti.push({ sprite, x0: sprite.x, vy: rnd(c.fallMin, c.fallMax), spin: rnd(-c.spinMax, c.spinMax), phase: rnd(0, Math.PI * 2), freq: rnd(2, 4) });
      },
    });
  }

  // --- Fase 4: la cuenta ---
  bill() {
    this.phase = 4;
    this.acceptAt = this.time.now + E.inputDelayMs;
    this.receipt.setVisible(true);
    this.tweens.add({ targets: this.receipt, x: E.receipt.x, duration: E.receipt.slideMs, ease: 'Cubic.easeOut' });

    // El sello PAGADO golpea: de escala 2 a 1 en 90 ms, con una sacudida corta.
    this.time.delayedCall(E.stamp.atMs, () => {
      this.stamp.setVisible(true).setScale(E.stamp.fromScale);
      this.tweens.add({
        targets: this.stamp,
        scale: 1,
        duration: E.stamp.slamMs,
        ease: 'Quad.easeIn',
        onComplete: () => this.cameras.main.shake(E.shakeMs, E.shakeIntensity),
      });
    });

    this.time.delayedCall(E.hint.atMs, () => {
      this.hint.setVisible(true);
      let lit = true;
      this.time.addEvent({ delay: E.hint.stepMs, loop: true, callback: () => this.hint.setFrame((lit = !lit) ? 0 : 1) });
    });
  }

  // Tecla en las fases 1-3: corta lo que esté en curso y deja todo servido, con el título arriba, antes de la cuenta.
  skip() {
    this.time.removeAllEvents();
    this.tweens.killAll();
    this.player.setPosition(E.player.toX, E.player.feetY);
    this.player.anims.timeScale = 1;
    this.playerAnim('idle');
    this.food.forEach((f) => f.setVisible(true).setScale(2));
    this.ticks.forEach((t) => t.setAlpha(1).setScale(1));
    this.startSteam();
    this.bubble.setVisible(false);
    this.title.setVisible(true).setY(E.title.y);
    if (this.anims.exists('end-title-wave')) this.title.play('end-title-wave', true);
    this.banner.setVisible(true).setScale(1);
    this.seno.stop();
    this.seno.setFrame(5).setY(E.seno.feetY); // brazos arriba, como en el mockup de la cuenta
    this.confetti.forEach((p) => p.sprite.destroy());
    this.confetti = [];
    this.bill();
  }

  update(time, delta) {
    if (!this.confetti.length) return;
    const dt = delta / 1000;
    const t = time / 1000;
    const c = E.confetti;
    this.confetti = this.confetti.filter((p) => {
      p.sprite.y += p.vy * dt;
      p.sprite.x = p.x0 + Math.sin(t * p.freq + p.phase) * c.swayPx;
      p.sprite.rotation += p.spin * dt;
      if (p.sprite.y < 280) return true;
      p.sprite.destroy();
      return false;
    });
  }
}
