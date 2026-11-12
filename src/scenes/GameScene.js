import * as Phaser from 'phaser';
import { GAME_W, GAME_H, PLAYER, CAMERA, DEV, DEPTH, GAME_OVER } from '../config/constants.js';
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
import { goToResults } from '../systems/startGame.js';
import { TouchControls } from '../systems/TouchControls.js';
import { SaveGame } from '../systems/SaveGame.js';

const SAVE_EVERY_MS = 3000; // cada cuánto se guarda la partida mientras se juega

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
    this.finishing = false; // fin del juego: fundido hacia la escena final (ver goToResults)
    this.deathFilter = null;
    this.deathSnapshot = null;
    this.overlayOpen = false; // pantalla encima del juego (los controles de la casa): sin botones táctiles
    this.tapped = false; // toque en el canvas pendiente (avanza diálogos en táctil)
    this.saveClock = 0;
  }

  create() {
    const room = this.room;
    this.controls = new Controls(this);
    Music.play(this, 'playing');

    // Partida en curso: desde aquí se guarda para poder continuarla (SaveGame).
    this.registry.set('currentRoom', this.roomId);

    // Tocar el canvas (o hacer clic) cuenta como "avanzar" mientras hay un diálogo que espera. Los botones
    // táctiles son HTML encima del canvas: sus toques no llegan aquí.
    this.input.on('pointerdown', () => (this.tapped = true));
    // Al irse de la escena, los botones táctiles desaparecen (GameOver, final, menús).
    this.events.once('shutdown', () => {
      TouchControls.setVisible(false);
      TouchControls.setInteractHint(false);
    });

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

    SaveGame.saveCurrent(this.registry);

    // SOLO desarrollo: F9 termina la partida y va a la tabla de tiempos (el final todavía no existe).
    // Las reglas rechazan tiempos de menos de LEADERBOARD.minTimeMs (constants.js). En el build de producción esto no existe.
    if (import.meta.env.DEV) {
      this.input.keyboard.on('keydown-F9', () => {
        if (!this.isDying && this.scene.isActive()) goToResults(this);
      });
    }
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
    if (this.isDying || this.finishing) return;
    this.isDying = true;
    PlayTimer.pause(this.registry);
    TouchControls.setVisible(false);
    TouchControls.setInteractHint(false);
    // El jugador se congela y reproduce la descarga completa; recién al terminar pasamos a Game Over.
    // Mientras tanto update() sale temprano (isDying), así que no hay entrada ni interacción.
    this.registry.set('deaths', (this.registry.get('deaths') ?? 0) + 1);
    const tip = this.level.deathTip?.(cause);
    this.player.electrocute(() => this.freezeForGameOver(tip));
  }

  // La sala queda de fondo de Game Over: quieta (escena pausada, sigue dibujándose), con la cámara donde
  // estaba y desaturada. El personaje lo vuelve a dibujar GameOver en grande, así que aquí se oculta.
  freezeForGameOver(tip) {
    this.player.setVisible(false);
    // Fuera también lo que es interfaz: indicadores de interacción (DEPTH.prompt) y todo lo de DEPTH.ui-1
    // para arriba (diálogo, HUD, avisos, carteles, debug). Las rayitas del viento (ui-2) se quedan: son ambiente.
    for (const obj of this.children.list) {
      if (obj.depth === DEPTH.prompt || obj.depth >= DEPTH.ui - 1) obj.setVisible(false);
    }

    // Saturación al 15% con el filtro ColorMatrix de la cámara (Phaser 4: camera.filters).
    // saturate(v) arma la matriz con diagonal x = 1 + 2v/3 y el resto y = (1 - x)/2; la diferencia x - y,
    // que es lo que queda del color, vale 1 + v. Con v = -0.85 queda 0.15.
    // Plan B (sin WebGL, o si el filtro lanza en la GPU de algún celular): una foto del canvas desaturada a mano.
    try {
      if (!this.renderer.gl) throw new Error('sin WebGL');
      this.deathFilter = this.cameras.main.filters.external.addColorMatrix();
      this.deathFilter.colorMatrix.saturate(GAME_OVER.saturation - 1);
    } catch (error) {
      console.warn('[GameScene] filtro de Game Over no disponible, uso la foto desaturada', error);
      this.deathFilter = null;
    }

    // Avance guardado con la muerte contada (si cierra la pestaña en el Game Over, no se "borra" el corrientazo).
    SaveGame.saveCurrent(this.registry);

    this.scene.pause();
    const launch = () => this.scene.launch('GameOver', { roomId: this.roomId, tip });
    // Con el plan B, GameOver espera a la foto: si se lanzara antes, la foto la incluiría a ella también.
    if (this.deathFilter) launch();
    else this.snapshotDesaturated(launch);
  }

  // Plan B del filtro de Game Over: foto del canvas, cada pixel mezclado con su gris (luminancia) según
  // GAME_OVER.saturation, y la foto encima del mundo, fija a la cámara. Mismo resultado que el ColorMatrix.
  // `onReady` corre con la foto ya puesta (o igual, si la foto falla: mejor un Game Over a color que ninguno).
  snapshotDesaturated(onReady) {
    this.renderer.snapshot((image) => {
      if (!this.sys.isActive() && !this.sys.isPaused()) return; // la escena ya se fue
      try {
        this.placeDesaturated(image);
      } catch (error) {
        console.warn('[GameScene] la foto desaturada también falló', error);
      }
      onReady?.();
    });
  }

  placeDesaturated(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = img.data;
    const s = GAME_OVER.saturation;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = gray + (d[i] - gray) * s;
      d[i + 1] = gray + (d[i + 1] - gray) * s;
      d[i + 2] = gray + (d[i + 2] - gray) * s;
    }
    ctx.putImageData(img, 0, 0);
    if (this.textures.exists('death-snapshot')) this.textures.remove('death-snapshot');
    this.textures.addCanvas('death-snapshot', canvas);
    this.deathSnapshot = this.add
      .image(0, 0, 'death-snapshot')
      .setOrigin(0)
      .setScrollFactor(0)
      .setDisplaySize(GAME_W, GAME_H)
      .setDepth(DEPTH.ui - 1.5);
  }

  // Lo llama GameOver antes de reiniciar la sala. La cámara se destruye igual al reiniciar la escena,
  // pero quitarlo explícito evita depender de eso.
  clearDeathFilter() {
    this.deathSnapshot?.destroy();
    this.deathSnapshot = null;
    if (!this.deathFilter) return;
    this.cameras.main?.filters.external.remove(this.deathFilter);
    this.deathFilter = null;
  }

  update(time, delta) {
    if (this.isDying || this.finishing) {
      TouchControls.setVisible(false);
      return;
    }

    // El timer corre durante diálogos; solo se detiene fuera de esta escena.
    PlayTimer.tick(this.registry, delta);

    // Guardado periódico de la partida (tiempo y flags), por si cierran la página sin aviso.
    this.saveClock += delta;
    if (this.saveClock >= SAVE_EVERY_MS) {
      this.saveClock = 0;
      SaveGame.saveCurrent(this.registry);
    }

    // Botones táctiles: solo jugando (no con un diálogo que espera, ni con una pantalla encima).
    TouchControls.setVisible(!this.dialog.blocking && !this.overlayOpen);
    const tapped = this.tapped;
    this.tapped = false;

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
    // Una sola consulta por frame: si hay diálogo esperando, la tecla (o un toque en la pantalla) avanza; si no,
    // interactúa con lo más cercano. Un diálogo automático (no bloquea) deja interactuar como siempre.
    const interactPressed = this.controls.justDown('interact');
    let nearest = null;
    if (!this.dialog.blocking && !this.player.frozen && !this.overlayOpen) {
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
    TouchControls.setInteractHint(!!nearest);

    if (this.dialog.blocking) {
      if (interactPressed || tapped) this.dialog.advance();
    } else if (interactPressed && nearest) {
      nearest.interact();
    }

    this.player.update(time, delta);
    this.level.update?.(time, delta);
    this.debug.update();
  }
}
