import * as Phaser from 'phaser';
import { GAME_W, GAME_H, PLAYER, CAMERA, PARALLAX, DEPTH } from '../config/constants.js';
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

    // --- Fondo con parallax ---
    this.createParallax();

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
    this.anchorParallax(room);

    // --- Debug (F1) ---
    this.debug = new DebugOverlay(this, this.player);
  }

  createParallax() {
    // Cada capa es un TileSprite de ancho de pantalla y alto de su imagen, fijo a la cámara (scrollFactor 0).
    // El "movimiento" no es del objeto sino de su textura: tilePositionX desplaza el patrón,
    // y como la textura se repite, la capa nunca se acaba aunque la sala sea más ancha que la imagen.
    this.parallaxLayers = [];
    PARALLAX.layers.forEach((layer, i) => {
      // Si el PNG no cargó (p. ej. clon sin la carpeta media/), omitimos la capa en vez de
      // dibujar la textura de "missing" de Phaser.
      if (!this.textures.exists(layer.key)) return;
      // Alto = alto de la imagen: así el TileSprite nunca repite en vertical (tilePositionY queda en 0)
      // y la posición vertical se maneja solo con su y.
      const imageH = this.textures.get(layer.key).getSourceImage().height;
      const ts = this.add
        .tileSprite(0, 0, GAME_W, imageH, layer.key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.background + i);
      this.parallaxLayers.push({ ...layer, ts, lastGap: 0 });
    });

    // ¿Por qué no en update()? Phaser calcula el scroll de la cámara (follow + lerp) en
    // camera.preRender, DESPUÉS de update. Leer scrollX en update daría el valor del frame anterior
    // y el fondo iría un frame atrasado respecto al mundo. FOLLOW_UPDATE se emite justo tras
    // calcular el scroll y antes de dibujar, así que fondo y mundo usan el mismo valor.
    const cam = this.cameras.main;
    cam.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.updateParallax, this);
    // La cámara principal se reutiliza entre reinicios de la escena: quitamos el listener al salir
    // para no acumular uno por cada muerte.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      cam.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.updateParallax, this);
    });
  }

  // Referencia vertical del parallax, calculada con la geometría real de la sala (llamar tras setupCamera).
  anchorParallax(room) {
    const cam = this.cameras.main;
    // scrollY máximo = cámara lo más abajo posible dentro de sus bounds.
    this.parallaxMaxScrollY = cam.getBounds().bottom - cam.height;
    // En esa posición, el suelo se ve en pantalla en groundY - maxScrollY. Queremos que la fila
    // groundLine de la imagen caiga ahí, así que el borde superior de la capa va groundLine px más arriba.
    // Ej. sala de prueba: suelo 384, maxScrollY 178 → suelo en pantalla 206 → capa en y = 206 - 256 = -50.
    this.parallaxBaseY = findGroundY(room) - this.parallaxMaxScrollY - PARALLAX.groundLine;
  }

  updateParallax() {
    const { scrollX, scrollY } = this.cameras.main;
    // Δ = cuánto subió la cámara respecto a la referencia (≥ 0).
    const rise = this.parallaxMaxScrollY - scrollY;
    for (const layer of this.parallaxLayers) {
      const { ts, factorX, factorY } = layer;
      // Redondeo a pixel entero: con factores como 0.05 o 0.2 el desplazamiento sería fraccionario
      // y el muestreo NEAREST alternaría entre dos filas/columnas de pixeles (temblor).
      ts.tilePositionX = Math.round(scrollX * factorX);
      // Vertical: movemos el TileSprite y no tilePositionY a propósito. tilePositionY repite la textura,
      // así que si la capa bajara más allá de su borde aparecería la parte de arriba de la imagen debajo;
      // moviendo y, lo que queda fuera de la imagen es simplemente transparente (y se nota si pasa).
      ts.y = Math.round(this.parallaxBaseY + factorY * rise);

      if (layer.checkBottom && this.debug?.enabled) this.checkParallaxBottom(layer);
    }
  }

  // Debug: si el borde inferior de la capa queda por encima del de la pantalla, debajo se vería un hueco.
  // Avisa solo cuando el faltante cambia (no en cada frame), y también cuando se cierra.
  checkParallaxBottom(layer) {
    const gap = Math.max(0, GAME_H - (layer.ts.y + layer.ts.height));
    if (gap === layer.lastGap) return;
    if (gap > 0) console.warn(`[Parallax] ${layer.key}: el borde inferior queda ${gap} px por encima de la pantalla`);
    else console.info(`[Parallax] ${layer.key}: borde inferior cubierto otra vez`);
    layer.lastGap = gap;
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
