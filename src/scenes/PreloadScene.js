import * as Phaser from 'phaser';
import { TILE, PLAYER, COLORS, PARALLAX, BACKGROUNDS, BACKGROUND_SOURCES, MUSIC } from '../config/constants.js';
import { bgKey } from '../systems/ParallaxBackground.js';
import { CHARACTERS, animKey } from '../data/characters.js';
import { NPC_SHEETS, npcAnimKey } from '../data/npcs.js';
import { APPLIANCES, applianceKey, propKey } from '../data/appliances.js';
import { ROOMS } from '../data/rooms/index.js';

// Carga de assets. Los fondos y los personajes con arte se cargan desde archivo; el resto del greybox
// se genera por código.
//
// Clave del diseño: el resto del juego solo conoce las *keys* de textura ('moises', 'tile', 'hazard'...).
// Cuando llegue el arte, este preload() pasará a hacer this.load.image / this.load.spritesheet
// con esas mismas keys y nada más del código tendrá que cambiar.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    // Fondo con parallax (public/assets/backgrounds/). Si algún PNG falla al cargar avisamos y seguimos:
    // GameScene omite las capas que falten en vez de dibujar la textura de "missing".
    this.load.on('loaderror', (file) => console.warn(`[Preload] no se pudo cargar ${file.key} (${file.url})`));
    // Cargamos todos los fondos (16 PNG chicos): así cambiar de sala o de fondo con F2 no espera carga.
    for (const bg of BACKGROUNDS) {
      for (const layer of PARALLAX.layers) {
        this.load.image(bgKey(bg, layer.id), `${PARALLAX.basePath}${BACKGROUND_SOURCES[bg]}/${bg}/${layer.file}`);
      }
    }

    // Personajes con arte: spritesheet + JSON con sus animaciones. El tamaño de frame sale del JSON,
    // pero el loader del spritesheet lo necesita antes de leerlo; por eso encadenamos: primero el JSON
    // y, cuando llega, encolamos el PNG (el loader sigue abierto mientras haya archivos pendientes).
    this.loadRoomArt();

    // Interfaz: fuente pixel (BitmapFont XML), logo, botón JUGAR y flecha de selección.
    this.load.bitmapFont('pixel', 'assets/fonts/corrientazo_font.png', 'assets/fonts/corrientazo_font.xml');
    this.load.image('ui-logo', 'assets/ui/logo.png');
    this.load.spritesheet('ui-button-jugar', 'assets/ui/button_jugar.png', { frameWidth: 88, frameHeight: 29 });
    this.load.spritesheet('ui-arrow', 'assets/ui/arrow.png', { frameWidth: 11, frameHeight: 10 });

    // Comanda del nombre y tabla de tiempos (public/assets/ui/results/README.txt).
    const res = 'assets/ui/results/';
    this.load.image('ne-ticket', res + 'ne_ticket.png');
    this.load.image('lb-board', res + 'lb_board.png');
    this.load.image('lb-card', res + 'lb_card.png');
    this.load.image('lb-bolt', res + 'lb_bolt.png');
    this.load.spritesheet('lb-heads', res + 'lb_heads.png', { frameWidth: 20, frameHeight: 18 });
    this.load.spritesheet('lb-medals', res + 'lb_medals.png', { frameWidth: 12, frameHeight: 12 });
    this.load.spritesheet('lb-row-hi', res + 'lb_row_hi.png', { frameWidth: 282, frameHeight: 18 });

    // Escena final (public/assets/ui/ending/README.txt).
    const end = 'assets/ui/ending/';
    for (const name of ['bg', 'counter', 'tray', 'tick', 'banner', 'receipt', 'stamp']) this.load.image(`end-${name}`, `${end}end_${name}.png`);
    this.load.spritesheet('end-food', end + 'end_food.png', { frameWidth: 16, frameHeight: 12 });
    this.load.spritesheet('end-steam', end + 'end_steam.png', { frameWidth: 8, frameHeight: 10 });
    this.load.spritesheet('end-title', end + 'end_title.png', { frameWidth: 266, frameHeight: 50 });
    this.load.spritesheet('end-confetti', end + 'end_confetti.png', { frameWidth: 4, frameHeight: 4 });
    this.load.spritesheet('end-hint', end + 'end_hint.png', { frameWidth: 196, frameHeight: 17 });
    this.load.spritesheet('end-hint-touch', end + 'end_hint_touch.png', { frameWidth: 165, frameHeight: 17 });
    // Botones táctiles (los dibuja el overlay HTML; aquí solo para la pantalla de controles de la casa).
    this.load.spritesheet('touch-buttons', 'assets/ui/touch/touch_buttons.png', { frameWidth: 32, frameHeight: 32 });

    // Game Over (public/assets/ui/gameover/, ver sus README). go_burst.png ya no se usa.
    const go = 'assets/ui/gameover/';
    this.load.spritesheet('go-pop', go + 'go_pop.png', { frameWidth: 136, frameHeight: 120 });
    this.load.spritesheet('go-title', go + 'go_title.png', { frameWidth: 266, frameHeight: 50 });
    this.load.spritesheet('go-smoke', go + 'go_smoke.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('go-hint', go + 'go_hint.png', { frameWidth: 188, frameHeight: 17 });
    // Versión táctil ("toca para reintentar"): mismo formato, 2 frames de 157x17.
    this.load.spritesheet('go-hint-touch', go + 'go_hint_touch.png', { frameWidth: 157, frameHeight: 17 });
    this.load.image('go-tipcard', go + 'go_tipcard.png');
    this.load.image('go-badge', go + 'go_badge.png');
    this.load.image('go-frame', go + 'go_frame.png');

    // Música (una key por pista: 'menus', 'playing', 'gameover'). Si falta un archivo, el loaderror de
    // arriba avisa y Music.play simplemente no suena.
    for (const [key, file] of Object.entries(MUSIC.tracks)) {
      this.load.audio(key, MUSIC.basePath + file);
    }

    for (const c of CHARACTERS.filter((ch) => ch.sheet)) {
      const dataKey = `${c.texture}-data`;
      this.load.json(dataKey, c.sheet.data);
      this.load.once(`filecomplete-json-${dataKey}`, (key, type, data) => {
        this.load.spritesheet(c.texture, c.sheet.image, { frameWidth: data.frameWidth, frameHeight: data.frameHeight });
      });
    }

    // NPCs (papá, abuela, vecino): mismo encadenamiento JSON → spritesheet que los personajes.
    for (const n of NPC_SHEETS) {
      const dataKey = `${n.texture}-data`;
      this.load.json(dataKey, n.data);
      this.load.once(`filecomplete-json-${dataKey}`, (key, type, data) => {
        this.load.spritesheet(n.texture, n.image, { frameWidth: data.frameWidth, frameHeight: data.frameHeight });
      });
    }
  }

  // Arte de las salas que lo declaran (campo `art`): pared y estructura como imágenes del tamaño de la sala,
  // y props (aparatos, puerta) como spritesheets descritos en un props.json. Mismo encadenamiento que los
  // personajes: el JSON trae el tamaño de frame que el spritesheet necesita antes de cargarse.
  // Las keys de los props son globales (`prop-<nombre>`): si dos salas traen un prop con el mismo nombre (el charco
  // de la calle y el del mercado, que es el mismo dibujo), se carga solo el de la primera sala.
  loadRoomArt() {
    const queued = new Set();
    for (const room of Object.values(ROOMS)) {
      const art = room.art;
      if (!art) continue;
      if (art.wall) this.load.image(`${room.id}-wall`, art.wall);
      if (art.tiles) this.load.image(`${room.id}-tiles`, art.tiles);
      if (art.props) {
        const dataKey = `${room.id}-props`;
        const dir = art.props.slice(0, art.props.lastIndexOf('/') + 1);
        this.load.json(dataKey, art.props);
        this.load.once(`filecomplete-json-${dataKey}`, (key, type, props) => {
          for (const [name, p] of Object.entries(props)) {
            if (queued.has(name)) continue;
            queued.add(name);
            this.load.spritesheet(propKey(name), dir + p.image, { frameWidth: p.frameWidth, frameHeight: p.frameHeight });
          }
        });
      }
    }
  }

  // Crea las animaciones de cada personaje a partir de su JSON. El frameRate de walk es el de referencia;
  // Player lo escala en vivo con la velocidad (ver ANIM en constants.js).
  createCharacterAnims() {
    for (const c of CHARACTERS.filter((ch) => ch.sheet)) {
      const data = this.cache.json.get(`${c.texture}-data`);
      if (!data || !this.textures.exists(c.texture)) continue;
      for (const [name, a] of Object.entries(data.animations)) {
        this.anims.create({
          key: animKey(c.texture, name),
          frames: this.anims.generateFrameNumbers(c.texture, { frames: a.frames }),
          frameRate: a.frameRate,
          repeat: a.repeat,
        });
      }
    }
  }

  // Animaciones de los NPCs desde su JSON, con keys `${texture}_${nombre}` (p. ej. 'papa_idle').
  createNpcAnims() {
    for (const n of NPC_SHEETS) {
      const data = this.cache.json.get(`${n.texture}-data`);
      if (!data || !this.textures.exists(n.texture)) continue;
      for (const [name, a] of Object.entries(data.animations)) {
        this.anims.create({
          key: npcAnimKey(n.texture, name),
          frames: this.anims.generateFrameNumbers(n.texture, { frames: a.frames }),
          frameRate: a.frameRate,
          repeat: a.repeat,
        });
      }
    }
  }

  // Animaciones que traiga algún props.json de sala (p. ej. las chispas del cable): key `prop-<nombre>-<anim>`.
  createPropAnims() {
    for (const room of Object.values(ROOMS)) {
      const props = room.art?.props && this.cache.json.get(`${room.id}-props`);
      if (!props) continue;
      for (const [name, p] of Object.entries(props)) {
        // Si otra sala ya creó las animaciones de un prop con el mismo nombre (ver loadRoomArt), no se repiten.
        if (!p.animations || !this.textures.exists(propKey(name))) continue;
        for (const [anim, a] of Object.entries(p.animations)) {
          if (this.anims.exists(`${propKey(name)}-${anim}`)) continue;
          this.anims.create({
            key: `${propKey(name)}-${anim}`,
            frames: this.anims.generateFrameNumbers(propKey(name), { frames: a.frames }),
            frameRate: a.frameRate,
            repeat: a.repeat,
          });
        }
      }
    }
  }

  create() {
    this.createCharacterAnims();
    this.createNpcAnims();
    this.createPropAnims();
    // Flecha de la selección: alterna sus 2 frames para "rebotar".
    if (this.textures.exists('ui-arrow')) {
      this.anims.create({
        key: 'ui-arrow-bounce',
        frames: this.anims.generateFrameNumbers('ui-arrow', { frames: [0, 1] }),
        frameRate: 3,
        repeat: -1,
      });
    }
    // Game Over: estallido detrás del personaje (loop) y bocanada de humo (una vez).
    if (this.textures.exists('go-pop')) {
      this.anims.create({ key: 'go-pop', frames: this.anims.generateFrameNumbers('go-pop'), frameRate: 6, repeat: -1 });
    }
    // Escena final: vapor de la sopa (6 fps) y la ola del título (5 fps), en loop.
    if (this.textures.exists('end-steam')) {
      this.anims.create({ key: 'end-steam', frames: this.anims.generateFrameNumbers('end-steam'), frameRate: 6, repeat: -1 });
    }
    if (this.textures.exists('end-title')) {
      this.anims.create({ key: 'end-title-wave', frames: this.anims.generateFrameNumbers('end-title'), frameRate: 5, repeat: -1 });
    }
    if (this.textures.exists('go-smoke')) {
      this.anims.create({ key: 'go-smoke', frames: this.anims.generateFrameNumbers('go-smoke'), frameRate: 8, repeat: 0 });
    }

    // Graphics fuera de la lista de display (no se dibuja): solo lo usamos como "pincel".
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    const make = (key, w, h, draw) => {
      g.clear();
      draw(g, w, h);
      g.generateTexture(key, w, h);
    };

    // Borde de 1 px por DENTRO de la textura: el tamaño no cambia, así sigue coincidiendo con el hitbox.
    // Se dibuja al final para que quede encima de los detalles (franja, ojos).
    const outline = (gr, w, h) => {
      gr.lineStyle(1, COLORS.outline).strokeRect(0.5, 0.5, w - 1, h - 1);
    };

    // Jugadores: rectángulo de color con una franja más clara arriba (indica hacia dónde está la "cabeza")
    // y un ojo a la derecha, para que se note el flipX al girar.
    CHARACTERS.filter((c) => !c.sheet).forEach((c) => {
      make(c.texture, PLAYER.width, PLAYER.height, (gr, w, h) => {
        gr.fillStyle(c.color).fillRect(0, 0, w, h);
        gr.fillStyle(0xffffff, 0.35).fillRect(0, 0, w, 4);
        gr.fillStyle(0x0b0d12).fillRect(w - 5, 8, 2, 3);
        outline(gr, w, h);
      });
    });

    // Tile sólido con borde superior/izquierdo más claro para leer la grilla.
    make('tile', TILE, TILE, (gr, w, h) => {
      gr.fillStyle(COLORS.tile).fillRect(0, 0, w, h);
      gr.fillStyle(COLORS.tileEdge).fillRect(0, 0, w, 1).fillRect(0, 0, 1, h);
    });

    make('npc', 16, 28, (gr, w, h) => {
      gr.fillStyle(COLORS.npc).fillRect(0, 0, w, h);
      gr.fillStyle(0x0b0d12).fillRect(4, 7, 2, 3).fillRect(10, 7, 2, 3);
      outline(gr, w, h);
    });

    // NPCs del mercado (placeholders, mismo molde que 'npc'): el vendedor del pescado y doña Carmen.
    for (const [key, color] of [['npc-vendedor', COLORS.vendedor], ['npc-carmen', COLORS.carmen]]) {
      make(key, 16, 28, (gr, w, h) => {
        gr.fillStyle(color).fillRect(0, 0, w, h);
        gr.fillStyle(0x0b0d12).fillRect(4, 7, 2, 3).fillRect(10, 7, 2, 3);
        outline(gr, w, h);
      });
    }

    // Variantes del tile sólido para leer el layout: escalón (E) y techo (T).
    for (const [key, color] of [['tile-step', COLORS.step], ['tile-roof', COLORS.roof]]) {
      make(key, TILE, TILE, (gr, w, h) => {
        gr.fillStyle(color).fillRect(0, 0, w, h);
        gr.fillStyle(COLORS.tileEdge).fillRect(0, 0, w, 1).fillRect(0, 0, 1, h);
      });
    }
    // Sólidos de la calle (nivel 2): mismo molde, un color por objeto para leer el layout.
    for (const [key, color] of [
      ['tile-car', COLORS.car],
      ['tile-bench', COLORS.bench],
      ['tile-curb', COLORS.curb],
      ['tile-stop-sign', COLORS.stopSign],
      ['tile-planter', COLORS.planter],
    ]) {
      make(key, TILE, TILE, (gr, w, h) => {
        gr.fillStyle(color).fillRect(0, 0, w, h);
        gr.fillStyle(COLORS.tileEdge).fillRect(0, 0, w, 1).fillRect(0, 0, 1, h);
      });
    }
    // Poste (P): decorativo, franja de 4 px centrada.
    make('pole', TILE, TILE, (gr) => {
      gr.fillStyle(COLORS.pole).fillRect(6, 0, 4, TILE);
    });

    // Parque (nivel 3): sólidos con el molde de siempre, un color por objeto.
    for (const [key, color] of [
      ['tile-grass', COLORS.grass],
      ['tile-tower', COLORS.tower],
      ['tile-bridge', COLORS.bridge],
    ]) {
      make(key, TILE, TILE, (gr, w, h) => {
        gr.fillStyle(color).fillRect(0, 0, w, h);
        gr.fillStyle(COLORS.tileEdge).fillRect(0, 0, w, 1).fillRect(0, 0, 1, h);
      });
    }
    // Decorativos del parque: farol (L) y asta de la manga (W) como franjas angostas; tronco (T) de 12 px.
    make('lamp', TILE, TILE, (gr) => gr.fillStyle(COLORS.lamp).fillRect(6, 0, 4, TILE));
    make('sock-pole', TILE, TILE, (gr) => gr.fillStyle(COLORS.sockPole).fillRect(7, 0, 2, TILE));
    make('trunk', TILE, TILE, (gr) => gr.fillStyle(COLORS.trunk).fillRect(0, 0, TILE, TILE));

    // Mercado (nivel 4): sólidos con el molde de siempre; la lata con un brillo para diferenciarla de la madera.
    for (const [key, color] of [
      ['tile-floor', COLORS.floorTile],
      ['tile-crate', COLORS.crate],
      ['tile-fruit', COLORS.fruitStall],
      ['tile-wood', COLORS.wood],
      ['tile-metal', COLORS.metal],
    ]) {
      make(key, TILE, TILE, (gr, w, h) => {
        gr.fillStyle(color).fillRect(0, 0, w, h);
        gr.fillStyle(COLORS.tileEdge).fillRect(0, 0, w, 1).fillRect(0, 0, 1, h);
        if (key === 'tile-metal') gr.fillStyle(0xe8ecf1, 0.5).fillRect(3, 3, 2, h - 6).fillRect(9, 3, 1, h - 6);
      });
    }
    // Obra (nivel 5): sólidos con el molde de siempre, con un detalle por material para leer el layout.
    for (const [key, color] of [
      ['tile-site', COLORS.siteGround],
      ['tile-sack', COLORS.sack],
      ['tile-concrete', COLORS.concrete],
      ['tile-beam', COLORS.beam],
    ]) {
      make(key, TILE, TILE, (gr, w, h) => {
        gr.fillStyle(color).fillRect(0, 0, w, h);
        gr.fillStyle(COLORS.tileEdge).fillRect(0, 0, w, 1).fillRect(0, 0, 1, h);
        if (key === 'tile-sack') gr.fillStyle(0x8f866f).fillRect(2, 7, 12, 1); // costura del saco
        if (key === 'tile-beam') gr.fillStyle(0x8796a6).fillRect(0, 1, w, 2).fillRect(0, h - 3, w, 2).fillRect(7, 3, 2, h - 6); // perfil en I
      });
    }
    // Mocho de columna: concreto con varillas que asoman arriba.
    make('tile-rebar-stub', TILE, TILE, (gr, w, h) => {
      gr.fillStyle(COLORS.concrete).fillRect(1, 5, w - 2, h - 5);
      gr.fillStyle(COLORS.rebar).fillRect(3, 0, 2, 6).fillRect(7, 1, 2, 5).fillRect(11, 0, 2, 6);
    });
    // Tablón del andamio (decorativo para RoomBuilder; la sala le pone la colisión de un solo sentido): tabla de 6 px.
    make('tile-plank', TILE, TILE, (gr, w) => {
      gr.fillStyle(COLORS.plank).fillRect(0, 0, w, 6);
      gr.fillStyle(0x6e4c26).fillRect(0, 5, w, 1).fillRect(w - 1, 0, 1, 6);
    });
    // NPCs de la obra (placeholders): el maestro de obra y la ingeniera residente, con casco.
    for (const [key, color] of [['npc-maestro', COLORS.maestro], ['npc-ingeniera', COLORS.ingeniera]]) {
      make(key, 16, 28, (gr, w, h) => {
        gr.fillStyle(color).fillRect(0, 0, w, h);
        gr.fillStyle(COLORS.helmet).fillRect(0, 0, w, 4);
        gr.fillStyle(0x0b0d12).fillRect(4, 8, 2, 3).fillRect(10, 8, 2, 3);
        outline(gr, w, h);
      });
    }

    // Taco (16x20): palanca arriba (prendido) o abajo (apagado).
    for (const [key, leverY] of [['breaker-on', 4], ['breaker-off', 12]]) {
      make(key, 16, 20, (gr, w, h) => {
        gr.fillStyle(COLORS.breaker).fillRect(0, 0, w, h);
        gr.fillStyle(0x2b2b2b).fillRect(6, 3, 4, 14);
        gr.fillStyle(key === 'breaker-on' ? 0xe5484d : 0x7cfc9a).fillRect(4, leverY, 8, 4);
        outline(gr, w, h);
      });
    }
    // Columna (|): decorativa, más angosta que el tile.
    make('column', TILE, TILE, (gr) => {
      gr.fillStyle(COLORS.column).fillRect(5, 0, 6, TILE);
    });

    // Puerta de salida (2x3 tiles): cerrada (madera con manija) y abierta (vano oscuro).
    make('door-closed', 32, 48, (gr, w, h) => {
      gr.fillStyle(COLORS.door).fillRect(0, 0, w, h);
      gr.fillStyle(0xe8c547).fillRect(w - 8, h / 2, 3, 3);
      outline(gr, w, h);
    });
    make('door-open', 32, 48, (gr, w, h) => {
      gr.fillStyle(COLORS.doorOpen).fillRect(0, 0, w, h);
      outline(gr, w, h);
    });

    // Aparatos: encendido (su color, con un "LED" claro) y desconectado (gris, sin LED).
    for (const [kind, a] of Object.entries(APPLIANCES)) {
      make(applianceKey(kind, true), a.w, a.h, (gr, w, h) => {
        gr.fillStyle(a.color).fillRect(0, 0, w, h);
        gr.fillStyle(0xffffff).fillRect(w - 3, 1, 2, 2);
        outline(gr, w, h);
      });
      make(applianceKey(kind, false), a.w, a.h, (gr, w, h) => {
        gr.fillStyle(COLORS.applianceOff).fillRect(0, 0, w, h);
        outline(gr, w, h);
      });
    }

    make('hazard', 16, 16, (gr, w, h) => {
      gr.fillStyle(COLORS.hazard).fillRect(0, 0, w, h);
      // Rayo simple en negro para que se lea como "peligro eléctrico".
      gr.fillStyle(0x0b0d12).fillRect(8, 2, 2, 6).fillRect(6, 7, 4, 2).fillRect(6, 8, 2, 6);
    });

    make('phone', 12, 18, (gr, w, h) => {
      gr.fillStyle(COLORS.phone).fillRect(0, 0, w, h);
      gr.fillStyle(COLORS.phoneAccent).fillRect(2, 2, w - 4, 4);
      gr.fillStyle(0x0b0d12).fillRect(2, 8, 2, 2).fillRect(5, 8, 2, 2).fillRect(8, 8, 2, 2);
      gr.fillStyle(0x0b0d12).fillRect(2, 12, 2, 2).fillRect(5, 12, 2, 2).fillRect(8, 12, 2, 2);
    });

    // Indicador de interacción: cuadrito claro con una flecha hacia abajo (la tecla para interactuar).
    // La flecha va dibujada a mano en vez de con texto '↓' para que sea pixel art nítido a 8 px.
    make('prompt-down', 11, 11, (gr, w, h) => {
      gr.fillStyle(COLORS.prompt).fillRect(0, 0, w, h);
      gr.fillStyle(0x0b0d12)
        .fillRect(4, 2, 3, 4) // tallo
        .fillRect(2, 6, 7, 1) // punta, de ancha a angosta
        .fillRect(3, 7, 5, 1)
        .fillRect(4, 8, 3, 1)
        .fillRect(5, 9, 1, 1);
    });

    g.destroy();
    this.scene.start('Title');
  }
}
