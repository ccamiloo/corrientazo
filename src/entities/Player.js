import * as Phaser from 'phaser';
import { MOVE, PLAYER, DEPTH, ANIM } from '../config/constants.js';
import { animKey } from '../data/characters.js';

// Mueve `current` hacia `target` como máximo `step` unidades, sin pasarse.
function approach(current, target, step) {
  if (current < target) return Math.min(current + step, target);
  if (current > target) return Math.max(current - step, target);
  return current;
}

// Jugador de plataformas. No conoce la escena concreta: recibe un objeto Controls y
// toda su "física de juego" sale de MOVE en constants.js.
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, textureKey, controls) {
    super(scene, x, y, textureKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.controls = controls;
    this.setDepth(DEPTH.player);

    // Hitbox fija de PLAYER.width x PLAYER.height (16x32), centrada en X dentro del frame y pegada abajo.
    // Con el spritesheet de 24x32 → offset (4, 0); con el placeholder de 16x32 → (0, 0).
    // Así la física es idéntica para todos los personajes, sin importar el ancho del arte.
    this.body.setSize(PLAYER.width, PLAYER.height, false);
    this.body.setOffset((this.width - PLAYER.width) / 2, this.height - PLAYER.height);
    this.body.setCollideWorldBounds(true);
    this.body.setGravityY(MOVE.gravity);
    // La velocidad horizontal la limitamos a mano; aquí solo acotamos la caída.
    this.body.setMaxVelocity(10000, MOVE.maxFallSpeed);

    // Animaciones: solo si la textura tiene las suyas (personajes con spritesheet). Los placeholders son una imagen fija.
    this.textureBase = textureKey;
    this.animated = scene.anims.exists(animKey(textureKey, 'idle'));
    this.dead = false;

    this.frozen = false;
    this.lastGroundedAt = -Infinity; // ms, último instante en que tocó suelo (coyote time)
    this.jumpPressedAt = -Infinity; // ms, último instante en que se presionó saltar (jump buffer)
    this.jumpCutDone = true; // si ya se aplicó el corte de salto variable en este salto
  }

  get grounded() {
    return this.body.blocked.down;
  }

  setFrozen(value) {
    this.frozen = value;
    if (value) {
      this.body.setVelocityX(0);
      // Olvidamos saltos pendientes para que no salte solo al cerrar el diálogo.
      this.jumpPressedAt = -Infinity;
    }
  }

  // Muerte por descarga: congela al jugador en el sitio (sin gravedad ni velocidad), reproduce
  // 'shock' completo (termina en el frame chamuscado), lo sostiene ANIM.burntHoldMs y recién entonces
  // llama onDone.
  // Sin animaciones (placeholder) llama onDone de inmediato, como antes.
  electrocute(onDone) {
    if (this.dead) return;
    this.dead = true;
    this.setFrozen(true);
    this.body.stop();
    this.body.moves = false; // ni gravedad ni colisiones lo desplazan mientras se electrocuta

    const key = animKey(this.textureBase, 'shock');
    if (!this.animated || !this.scene.anims.exists(key)) {
      onDone();
      return;
    }
    this.anims.timeScale = 1; // la caminata pudo dejarlo acelerado o frenado
    // Al completar, la animación queda detenida en su último frame (chamuscado); el timer de la escena
    // espera la pausa. Si la escena se cierra antes, el TimerEvent se descarta con ella.
    this.once(`animationcomplete-${key}`, () => this.scene.time.delayedCall(ANIM.burntHoldMs, onDone));
    this.play(key);
  }

  respawn(x, y) {
    this.body.reset(x, y);
    this.lastGroundedAt = -Infinity;
    this.jumpPressedAt = -Infinity;
  }

  // `time` y `delta` llegan del update de la escena (ms).
  update(time, delta) {
    const body = this.body;
    const dt = delta / 1000;
    const grounded = this.grounded;

    if (grounded) this.lastGroundedAt = time;

    // --- Entrada ---
    // Leemos justDown aunque esté congelado para "consumir" la pulsación y que no quede pendiente.
    const jumpJustPressed = this.controls.justDown('jump');
    let dir = 0;
    let jumpHeld = false;
    if (!this.frozen) {
      if (this.controls.isDown('left')) dir -= 1;
      if (this.controls.isDown('right')) dir += 1;
      jumpHeld = this.controls.isDown('jump');
      if (jumpJustPressed) this.jumpPressedAt = time;
    }

    // --- Horizontal: aceleración / desaceleración ---
    // Lo hacemos a mano en vez de usar setDrag/setAcceleration de Arcade porque el drag solo
    // actúa cuando la aceleración es 0 y no permite valores distintos en suelo y aire.
    const vx = body.velocity.x;
    let rate;
    if (dir === 0) {
      rate = grounded ? MOVE.decel : MOVE.airDecel;
    } else if (grounded && Math.sign(vx) === -dir) {
      rate = MOVE.turnAccel; // girando: más agarre para que el cambio de dirección se sienta ágil
    } else {
      rate = grounded ? MOVE.accel : MOVE.airAccel;
    }
    body.setVelocityX(approach(vx, dir * MOVE.maxSpeed, rate * dt));
    if (dir !== 0) this.setFlipX(dir < 0);

    // --- Salto con coyote time y jump buffer ---
    // Buffer: el salto se "recuerda" jumpBufferMs. Coyote: el suelo se "recuerda" coyoteMs.
    // Si ambos recuerdos se solapan, saltamos y consumimos los dos para evitar doble salto.
    const buffered = time - this.jumpPressedAt <= MOVE.jumpBufferMs;
    const canCoyote = time - this.lastGroundedAt <= MOVE.coyoteMs;
    if (buffered && canCoyote) {
      body.setVelocityY(-MOVE.jumpVelocity);
      this.jumpPressedAt = -Infinity;
      this.lastGroundedAt = -Infinity;
      this.jumpCutDone = false;
    }

    // --- Salto variable ---
    // Si suelta el botón mientras todavía sube, recortamos la velocidad una sola vez.
    if (!this.jumpCutDone && !jumpHeld && body.velocity.y < 0) {
      body.setVelocityY(body.velocity.y * MOVE.jumpCutMultiplier);
      this.jumpCutDone = true;
    }
    if (body.velocity.y >= 0) this.jumpCutDone = true;

    // --- Gravedad asimétrica: cae más rápido de lo que sube ---
    body.setGravityY(body.velocity.y > 0 ? MOVE.gravity * MOVE.fallGravityMultiplier : MOVE.gravity);

    this.updateAnimation(grounded);
  }

  // Elige la animación según el estado físico. La dirección (flipX) ya la fijó update() con la entrada,
  // así que al quedarse quieto conserva la última.
  updateAnimation(grounded) {
    if (!this.animated || this.dead) return;
    const { velocity } = this.body;
    const speed = Math.abs(velocity.x);

    // En el frame en que salta, blocked.down sigue en true hasta el próximo paso de física; por eso
    // "subiendo" (vy < 0) manda sobre "en el suelo" y la animación de salto arranca sin un frame de retraso.
    let name;
    if (velocity.y < 0) name = 'jump';
    else if (grounded) name = speed > ANIM.walkMinSpeed ? 'walk' : 'idle';
    else name = 'fall';

    const key = animKey(this.textureBase, name);
    // ignoreIfPlaying = true: si ya está en esa animación no la reinicia. Al ENTRAR a walk desde otra,
    // play arranca desde el primer frame de la animación (walk_1), nunca a mitad del ciclo.
    this.play(key, true);

    if (name === 'walk') {
      // Ritmo proporcional a la velocidad: fps deseado = |vx| · frames / pxPorCiclo. timeScale escala el
      // frameRate de referencia de la animación (el del JSON) hasta ese valor.
      const anim = this.anims.currentAnim;
      const fps = (speed * anim.frames.length) / ANIM.walkPxPerCycle;
      this.anims.timeScale = fps / anim.frameRate;
    } else {
      this.anims.timeScale = 1;
    }
  }
}
