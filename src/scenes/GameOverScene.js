import * as Phaser from 'phaser';
import { GAME_W, GAME_H, UI, GAME_OVER as GO } from '../config/constants.js';
import { currentCharacter } from '../data/characters.js';
import { pixelText } from '../systems/pixelText.js';
import { PlayTimer } from '../systems/PlayTimer.js';
import { Music } from '../systems/Music.js';

// Tip genérico, para las muertes sin tip propio (la sala lo pasa en data.tip según la causa).
const TIPS = ['Nunca toques un cable suelto: aléjate y llama a un técnico.'];

// Capas de abajo hacia arriba (las profundidades solo dejan explícito el orden de creación).
const LAYER = { paper: 0, pop: 1, character: 2, smoke: 3, title: 4, card: 5, badge: 6, hint: 7, frame: 8 };

// Pantalla de Game Over, lanzada ENCIMA de la escena Game pausada (ver GameScene.freezeForGameOver):
// lo que se ve de fondo es la sala donde murió el jugador, quieta y desaturada por el filtro de su cámara.
// Esta escena no pone color de fondo en su cámara, así que es transparente salvo lo que dibuja.
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.roomId = data.roomId;
    this.tip = data.tip;
  }

  create() {
    // El timer ya lo pausó GameScene al morir; aquí no corre porque solo GameScene llama a tick().
    Music.play(this, 'gameover');

    // Velo color papel: aclara el gris de la sala (no la oscurece), como en el mockup.
    this.add.rectangle(0, 0, GAME_W, GAME_H, GO.paperColor, GO.paperAlpha).setOrigin(0).setDepth(LAYER.paper);

    this.createPop();
    this.createCharacter();
    this.createTitle();
    this.createCard();
    this.createBadge();
    this.add.image(0, 0, 'go-frame').setOrigin(0).setDepth(LAYER.frame);

    // Golpe de entrada: flash blanco y sacudida, solo en la cámara de esta escena (la sala de fondo no se mueve).
    const cam = this.cameras.main;
    cam.flash(GO.flashMs, 255, 255, 255);
    cam.shake(GO.shakeMs, GO.shakeIntensity);

    this.time.delayedCall(GO.inputDelayMs, () => this.acceptInput());
  }

  // Estallido de cómic detrás del personaje: aparece creciendo desde 0 con un rebote (Back).
  createPop() {
    const pop = this.add.sprite(GO.pop.x, GO.pop.y, 'go-pop').setDepth(LAYER.pop).setScale(0);
    if (this.anims.exists('go-pop')) pop.play('go-pop');
    this.tweens.add({ targets: pop, scale: 1, duration: GO.pop.inMs, ease: 'Back.easeOut' });
  }

  // El personaje elegido en grande (escala entera), con los pies en (x, feetY): alterna shock_1/shock_2 y queda
  // chamuscado (burnt), y desde ahí le sale humo de la cabeza.
  createCharacter() {
    const c = GO.character;
    const { texture } = currentCharacter(this.registry);
    const sprite = this.add.sprite(c.x, c.feetY, texture).setOrigin(0.5, 1).setScale(c.scale).setDepth(LAYER.character);

    // Frames del JSON de los personajes: shock_1 = 5, shock_2 = 6, burnt = 7. Un placeholder sin spritesheet
    // no los tiene: se queda con su imagen y solo echa humo.
    const tex = this.textures.get(texture);
    const hasFrames = [5, 6, 7].every((f) => tex.has(f));
    if (!hasFrames) {
      this.startSmoke();
      return;
    }

    sprite.setFrame(5);
    // shockMs / shockStepMs pasos: los primeros alternan 5/6 y el último deja burnt (a los 0.7 s justos).
    const steps = Math.round(c.shockMs / c.shockStepMs);
    let i = 0;
    this.time.addEvent({
      delay: c.shockStepMs,
      repeat: steps - 1,
      callback: () => {
        i++;
        if (i >= steps) {
          sprite.setFrame(7);
          this.startSmoke();
        } else sprite.setFrame(i % 2 ? 6 : 5);
      },
    });
  }

  // Cada GO.smoke.everyMs sale una bocanada desde un x al azar de la cabeza: sube y se destruye al terminar.
  startSmoke() {
    const s = GO.smoke;
    // La subida dura lo mismo que la animación (5 frames a 8 fps = 625 ms).
    const animMs = this.anims.get('go-smoke')?.duration ?? 625;
    const puff = () => {
      const x = Phaser.Math.Between(s.xMin, s.xMax);
      const smoke = this.add.sprite(x, s.y, 'go-smoke').setDepth(LAYER.smoke);
      if (this.anims.exists('go-smoke')) smoke.play('go-smoke');
      this.tweens.add({ targets: smoke, y: s.y - s.rise, duration: animMs, onComplete: () => smoke.destroy() });
    };
    puff();
    this.time.addEvent({ delay: s.everyMs, loop: true, callback: puff });
  }

  // Título: entra temblando (frames 1-2) y queda en el 0; cada tanto, un temblorcito.
  createTitle() {
    const t = GO.title;
    this.title = this.add.sprite(t.x, t.y, 'go-title', 1).setOrigin(0).setDepth(LAYER.title);
    this.shakeTitle(t.introMs);
    this.time.addEvent({ delay: t.twitchEveryMs, loop: true, callback: () => this.shakeTitle(t.twitchMs) });
  }

  // Alterna los frames 1 y 2 cada stepMs durante `ms` y vuelve al 0.
  shakeTitle(ms) {
    const t = GO.title;
    const steps = Math.max(1, Math.round(ms / t.stepMs));
    let i = 0;
    this.title.setFrame(1);
    this.time.addEvent({
      delay: t.stepMs,
      repeat: steps - 1,
      callback: () => {
        i++;
        this.title.setFrame(i >= steps ? 0 : 1 + (i % 2));
      },
    });
  }

  // Tarjeta ELECTRITIP con el tip: entra deslizándose desde abajo cuando el título termina de temblar.
  createCard() {
    const k = GO.card;
    const card = this.add.container(k.x, k.fromY).setDepth(LAYER.card);
    const text = this.tip ?? Phaser.Utils.Array.GetRandom(TIPS);
    // Tinta oscura de la tarjeta (el mismo morado del contorno de la UI), sin contorno, alineado a la izquierda.
    const tip = pixelText(this, k.textDx, k.textDy, text, { color: UI.outline, outline: false, maxWidth: k.textMaxWidth });
    card.add([this.add.image(0, 0, 'go-tipcard').setOrigin(0), tip]);
    this.tweens.add({ targets: card, y: k.y, duration: k.slideMs, delay: GO.title.introMs, ease: 'Quad.easeOut' });
  }

  // Contador de corrientazos de la partida (registry 'deaths': lo suma GameScene.die, lo reinicia startNewGame).
  createBadge() {
    const b = GO.badge;
    this.add.image(b.x, b.y, 'go-badge').setOrigin(0).setDepth(LAYER.badge);
    pixelText(this, b.textX, b.textY, `x ${this.registry.get('deaths') ?? 1}`, { color: UI.yellow }).setDepth(LAYER.badge);
  }

  // Desde aquí cualquier tecla reintenta: aparece la pastilla, que parpadea entre sus dos frames.
  acceptInput() {
    const h = GO.hint;
    const hint = this.add.sprite(h.x, h.y, 'go-hint', 0).setDepth(LAYER.hint);
    let lit = true;
    this.time.addEvent({ delay: h.stepMs, loop: true, callback: () => hint.setFrame((lit = !lit) ? 0 : 1) });

    this.input.keyboard.once('keydown', () => {
      PlayTimer.resume(this.registry);
      // La escena Game sigue viva (pausada) debajo: se le quita el filtro y scene.start la reinicia limpia
      // (shutdown + create), a la vez que detiene esta escena.
      this.scene.get('Game').clearDeathFilter();
      this.scene.start('Game', { roomId: this.roomId });
    });
  }
}
