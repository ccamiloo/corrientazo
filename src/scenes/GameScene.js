import * as Phaser from 'phaser';
import { GAME_W, GAME_H, PLAYER, CAMERA, DEV } from '../config/constants.js';
import { currentCharacter } from '../data/characters.js';
import { ROOMS } from '../data/rooms/index.js';
import { LEVELS } from '../levels/index.js';
import { Player } from '../entities/Player.js';
import { Controls } from '../systems/Controls.js';
import { DialogBox } from '../systems/DialogBox.js';
import { DebugOverlay } from '../systems/DebugOverlay.js';
import { PlayTimer } from '../systems/PlayTimer.js';
import { RoomFlags } from '../systems/RoomFlags.js';
import { buildRoom, tileToFeet, findGroundY } from '../systems/RoomBuilder.js';
import { ParallaxBackground } from '../systems/ParallaxBackground.js';
import { Music } from '../systems/Music.js';

// Escena de juego genérica: arma la habitación indicada por roomId a partir de sus datos.
// Lo común (fondo, tiles, jugador, diálogo, cámara, interacción) vive aquí; lo propio de cada sala
// (NPCs, peligros, misiones) lo arma su script en src/levels/, elegido por el campo `script` de la sala.
export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  // init corre en cada start/restart: aquí (y no en el constructor) se resetea el estado de la escena.
  init(data) {
    this.roomId = data.roomId ?? 'testRoom';
    this.room = ROOMS[this.roomId];
    this.isDying = false;
  }

  create() {
    const room = this.room;
    this.controls = new Controls(this);
    Music.play(this, 'playing');

    // --- Fondo con parallax (el de la sala; 'street' si no define uno) ---
    this.background = new ParallaxBackground(this, room.background ?? 'street');

    // --- Habitación ---
    const { solids, width, height } = buildRoom(this, room);
    this.physics.world.setBounds(0, 0, width, height);

    // --- Jugador ---
    // El sprite tiene origen al centro, así que lo subimos media altura desde el punto de apoyo.
    const character = currentCharacter(this.registry);
    const spawn = tileToFeet(room.spawn);
    this.player = new Player(this, spawn.x, spawn.y - PLAYER.height / 2, character.texture, this.controls);
    this.solidsCollider = this.physics.add.collider(this.player, solids);

    // --- Diálogo ---
    // freeze/unfreeze como funciones flecha: se pasan sueltas como callbacks a los scripts de sala.
    this.dialog = new DialogBox(this);
    this.freeze = () => this.player.setFrozen(true);
    this.unfreeze = () => this.player.setFrozen(false);

    // --- Lógica propia de la sala ---
    const createLevel = LEVELS[room.script ?? 'testRoom'];
    this.level = createLevel(this);
    this.interactables = this.level.interactables ?? [];

    // --- Cámara ---
    this.setupCamera(width, height);
    this.background.anchor(findGroundY(room));

    // --- Debug (F1) ---
    this.debug = new DebugOverlay(this, this.player);
  }

  // Flags de la sala actual (persisten en el registry entre muertes y reinicios de escena).
  flag(name) {
    return RoomFlags.get(this.registry, this.roomId, name);
  }

  setFlag(name, value = true) {
    RoomFlags.set(this.registry, this.roomId, name, value);
  }

  setupCamera(roomW, roomH) {
    const cam = this.cameras.main;
    // Si la sala es más chica que la pantalla en algún eje, ampliamos los bounds de forma
    // simétrica para que la sala quede centrada (Phaser la alinearía a la izquierda/arriba).
    const bx = roomW < GAME_W ? (roomW - GAME_W) / 2 : 0;
    const by = roomH < GAME_H ? (roomH - GAME_H) / 2 : 0;
    cam.setBounds(bx, by, Math.max(roomW, GAME_W), Math.max(roomH, GAME_H));

    // Anti-temblor:
    // - roundPixels=true en startFollow: el scroll de la cámara se redondea a pixeles enteros,
    //   así el lerp no deja la vista oscilando entre dos valores sub-pixel.
    // - deadzone: mientras el jugador esté dentro de esa zona la cámara no se mueve, así que
    //   micro-variaciones de su Y (gravedad empujando contra el suelo) no llegan a la cámara.
    cam.startFollow(this.player, true, CAMERA.lerpX, CAMERA.lerpY);
    cam.setDeadzone(CAMERA.deadzoneW, CAMERA.deadzoneH);
    cam.roundPixels = true;
  }

  // Atajo usado por pruebas y por el script de la sala de prueba.
  disableHazard() {
    this.level.disableHazard?.();
  }

  // `cause` (opcional, p. ej. 'cable' o 'puddle'): el script de la sala la traduce a un tip para Game Over
  // con deathTip(cause); sin tip, GameOver muestra uno genérico.
  die(cause) {
    // El overlap se dispara en cada step mientras se toquen; el guard evita iniciar GameOver varias veces.
    if (this.isDying) return;
    this.isDying = true;
    PlayTimer.pause(this.registry);
    // El jugador se congela y reproduce la descarga completa; recién al terminar pasamos a Game Over.
    // Mientras tanto update() sale temprano (isDying), así que no hay entrada ni interacción.
    const tip = this.level.deathTip?.(cause);
    this.player.electrocute(() => this.scene.start('GameOver', { roomId: this.roomId, tip }));
  }

  update(time, delta) {
    if (this.isDying) return;

    // El timer corre durante diálogos; solo se detiene fuera de esta escena.
    PlayTimer.tick(this.registry, delta);

    if (this.controls.justDown('debug')) this.debug.toggle();
    // F2 (debug): siguiente fondo. No se guarda: al morir o reiniciar vuelve el de la sala.
    if (this.controls.justDown('cycleBackground')) {
      this.background.cycle();
      console.info(`[Parallax] fondo: ${this.background.name}`);
    }
    // F3 (desarrollo): volver al menú de salas.
    if (this.controls.justDown('devMenu') && DEV.menu) {
      this.scene.start('DevMenu');
      return;
    }

    // --- Interacción (tecla abajo) ---
    // Una sola consulta por frame: si hay diálogo abierto, la tecla avanza; si no, interactúa con lo más cercano.
    const interactPressed = this.controls.justDown('interact');
    let nearest = null;
    if (!this.dialog.isOpen && !this.player.frozen) {
      let best = Infinity;
      for (const it of this.interactables) {
        const d = Math.abs(it.x - this.player.x);
        if (it.isInRange(this.player) && d < best) {
          best = d;
          nearest = it;
        }
      }
    }
    for (const it of this.interactables) it.setPromptVisible(it === nearest);

    if (interactPressed) {
      if (this.dialog.isOpen) this.dialog.advance();
      else if (nearest) nearest.interact();
    }

    this.player.update(time, delta);
    this.level.update?.(time, delta);
    this.debug.update();
  }
}
