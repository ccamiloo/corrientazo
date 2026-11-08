import * as Phaser from 'phaser';
import { GAME_W, GAME_H, PLAYER, CAMERA } from '../config/constants.js';
import { CHARACTERS } from '../data/characters.js';
import { ROOMS } from '../data/rooms/index.js';
import { Player } from '../entities/Player.js';
import { Npc } from '../entities/Npc.js';
import { Interactable } from '../entities/Interactable.js';
import { Hazard } from '../entities/Hazard.js';
import { Controls } from '../systems/Controls.js';
import { DialogBox } from '../systems/DialogBox.js';
import { DebugOverlay } from '../systems/DebugOverlay.js';
import { PlayTimer } from '../systems/PlayTimer.js';
import { RoomFlags } from '../systems/RoomFlags.js';
import { buildRoom, tileToFeet, findGroundY } from '../systems/RoomBuilder.js';
import { ParallaxBackground } from '../systems/ParallaxBackground.js';

// Escena de juego genérica: arma la habitación indicada por roomId a partir de sus datos.
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

    // --- Fondo con parallax (el de la sala; 'street' si no define uno) ---
    this.background = new ParallaxBackground(this, room.background ?? 'street');

    // --- Habitación ---
    const { solids, width, height } = buildRoom(this, room);
    this.physics.world.setBounds(0, 0, width, height);

    // --- Jugador ---
    // El sprite tiene origen al centro, así que lo subimos media altura desde el punto de apoyo.
    const character = CHARACTERS[this.registry.get('characterIndex') ?? 0];
    const spawn = tileToFeet(room.spawn);
    this.player = new Player(this, spawn.x, spawn.y - PLAYER.height / 2, character.texture, this.controls);
    this.physics.add.collider(this.player, solids);

    // --- Diálogo ---
    this.dialog = new DialogBox(this);
    const freeze = () => this.player.setFrozen(true);
    const unfreeze = () => this.player.setFrozen(false);

    // --- Flags de la habitación ---
    const phoneFlag = room.phone.flag;
    const flag = (name) => RoomFlags.get(this.registry, this.roomId, name);

    // --- NPC ---
    const npcPos = tileToFeet(room.npc);
    this.npc = new Npc(this, npcPos.x, npcPos.y, 'npc', {
      dialogBox: this.dialog,
      getLines: () => (flag(phoneFlag) ? room.npc.dialog.afterCall : room.npc.dialog.default),
      onOpen: freeze,
      onClose: unfreeze,
    });

    // --- Obstáculo ---
    // room.hazard está en tiles salvo w/h/range (px); lo convertimos a px de mundo.
    const hz = room.hazard;
    const hzFeet = tileToFeet(hz);
    this.hazard = new Hazard(this, { ...hz, x: hzFeet.x - 8, y: hzFeet.y });
    this.hazardOverlap = this.physics.add.overlap(this.player, this.hazard, () => this.die());
    if (flag(phoneFlag)) this.disableHazard();

    // --- Teléfono (interactuable final) ---
    const phonePos = tileToFeet(room.phone);
    this.phone = new Interactable(this, phonePos.x, phonePos.y, 'phone', {
      onInteract: () => {
        freeze();
        if (flag(phoneFlag)) {
          this.dialog.open(room.phone.dialog.already, unfreeze);
          return;
        }
        // El flag se marca al terminar la llamada, así el obstáculo desaparece al cerrar el diálogo.
        this.dialog.open(room.phone.dialog.call, () => {
          RoomFlags.set(this.registry, this.roomId, phoneFlag, true);
          this.disableHazard();
          unfreeze();
        });
      },
    });
    this.interactables = [this.npc, this.phone];

    // --- Cámara ---
    this.setupCamera(width, height);
    this.background.anchor(findGroundY(room));

    // --- Debug (F1) ---
    this.debug = new DebugOverlay(this, this.player);
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

  disableHazard() {
    this.hazard.disable();
    if (this.hazardOverlap) this.hazardOverlap.active = false;
  }

  die() {
    // El overlap se dispara en cada step mientras se toquen; el guard evita iniciar GameOver varias veces.
    if (this.isDying) return;
    this.isDying = true;
    PlayTimer.pause(this.registry);
    this.scene.start('GameOver', { roomId: this.roomId });
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

    // --- Interacción (tecla abajo) ---
    // Una sola consulta por frame: si hay diálogo abierto, la tecla avanza; si no, interactúa con lo más cercano.
    const interactPressed = this.controls.justDown('interact');
    let nearest = null;
    if (!this.dialog.isOpen) {
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
    this.debug.update();
  }
}
