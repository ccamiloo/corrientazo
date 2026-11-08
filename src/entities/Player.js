import * as Phaser from 'phaser';
import { MOVE, PLAYER, DEPTH } from '../config/constants.js';

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

    // Hitbox de tamaño entero e igual al placeholder. Con sprites reales probablemente se ajuste con setSize/setOffset.
    this.body.setSize(PLAYER.width, PLAYER.height);
    this.body.setCollideWorldBounds(true);
    this.body.setGravityY(MOVE.gravity);
    // La velocidad horizontal la limitamos a mano; aquí solo acotamos la caída.
    this.body.setMaxVelocity(10000, MOVE.maxFallSpeed);

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
  }
}
