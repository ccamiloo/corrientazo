import * as Phaser from 'phaser';
import { TILE, PLAYER, COLORS, PARALLAX, BACKGROUNDS, BACKGROUND_SOURCES, MUSIC } from '../config/constants.js';
import { bgKey } from '../systems/ParallaxBackground.js';
import { CHARACTERS, animKey } from '../data/characters.js';
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
  }

  // Arte de las salas que lo declaran (campo `art`): pared y estructura como imágenes del tamaño de la sala,
  // y props (aparatos, puerta) como spritesheets descritos en un props.json. Mismo encadenamiento que los
  // personajes: el JSON trae el tamaño de frame que el spritesheet necesita antes de cargarse.
  loadRoomArt() {
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

  create() {
    this.createCharacterAnims();

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

    // NPCs de la casa: mismo molde que 'npc', con otro color.
    for (const [key, color] of [
      ['npc-dad', COLORS.npcDad],
      ['npc-grandma', COLORS.npcGrandma],
      ['npc-neighbor', COLORS.npcNeighbor],
    ]) {
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
    this.scene.start('CharacterSelect');
  }
}
