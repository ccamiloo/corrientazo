// Constantes globales de Corrientazo.
// Todo lo que afecta el "game feel" vive aquí para poder ajustarlo sin tocar la lógica.
// Unidades: px = pixeles de la resolución interna (480x270), s = segundos, ms = milisegundos.

// --- Pantalla y grilla ---
export const GAME_W = 480;
export const GAME_H = 270;
export const TILE = 16;

// --- Jugador ---
export const PLAYER = {
  width: 16, // px, ancho del placeholder y del hitbox
  height: 32, // px, alto del placeholder y del hitbox
};

// --- Movimiento ---
// Referencia para ajustar el salto: altura máxima ≈ jumpVelocity² / (2 · gravity).
// Con 340 y 900 → ~64 px = 4 tiles (lo justo para subir plataformas separadas 3 tiles).
export const MOVE = {
  maxSpeed: 130, // px/s, velocidad horizontal máxima
  accel: 1400, // px/s², aceleración en el suelo (más alto = arranca más rápido)
  decel: 1800, // px/s², frenado en el suelo al soltar la dirección
  turnAccel: 2400, // px/s², aceleración al cambiar de dirección en el suelo (giro con "agarre")
  airAccel: 900, // px/s², aceleración en el aire (menos control que en el suelo)
  airDecel: 600, // px/s², frenado en el aire al soltar la dirección

  gravity: 900, // px/s², gravedad mientras sube
  fallGravityMultiplier: 1.6, // multiplica la gravedad mientras cae (caída más rápida que la subida)
  maxFallSpeed: 420, // px/s, velocidad terminal de caída

  jumpVelocity: 340, // px/s, impulso inicial del salto
  jumpCutMultiplier: 0.45, // al soltar el salto mientras sube, vy se multiplica por esto (salto variable)

  coyoteMs: 100, // ms en que todavía puedes saltar después de salir de un borde
  jumpBufferMs: 100, // ms en que se "recuerda" un salto presionado justo antes de aterrizar
};

// --- Animación del personaje ---
export const ANIM = {
  // Ritmo de la caminata sincronizado con la velocidad: un ciclo de walk (4 frames) corresponde a
  // walkPxPerCycle px recorridos. frameRate = |vx| · framesDelCiclo / walkPxPerCycle.
  // Con maxSpeed 130 y 32 px → 130 · 4 / 32 ≈ 16 fps a velocidad máxima (más lento al acelerar/frenar).
  walkPxPerCycle: 32,
  // px/s; por debajo de esto en el suelo se considera "quieto" (idle). Evita que al frenar se vea
  // un paso a cámara lenta durante los últimos frames de la desaceleración.
  walkMinSpeed: 10,
};

// --- Cámara ---
export const CAMERA = {
  lerpX: 0.15, // 0..1, suavizado horizontal (1 = sigue pegada, más bajo = más suave)
  lerpY: 0.12, // 0..1, suavizado vertical
  deadzoneW: 32, // px, zona central donde el jugador se mueve sin que la cámara reaccione
  deadzoneH: 48, // px, idem en vertical; absorbe micro-variaciones de Y y evita temblor
};

// --- Fondo con parallax ---
// Capas de fondo, de atrás hacia adelante. Cada una es un TileSprite fijo a la cámara, de 480 px de
// ancho y con el alto real de su imagen (270 o 400): repite solo en horizontal. Factores: 0 = no se mueve (cielo, "infinitamente lejos"); 1 = se movería igual que el mundo.
//   Horizontal (factorX): se desplaza la textura (tilePositionX = scrollX · factorX). Las capas de 960 px
//     se repiten sin costura, así que sirven para salas de cualquier ancho.
//   Vertical (factorY): anclado al suelo, salvo las capas con factorY 0 (el cielo), que quedan fijas en
//     y = 0 cubriendo toda la pantalla y nunca se mueven. Con la cámara lo más abajo posible, la fila
//     groundLine de cada imagen coincide en pantalla con la superficie del suelo; si la cámara sube Δ px,
//     la capa baja factorY · Δ px (el suelo baja Δ, así que la capa "se queda atrás" como algo lejano).
// Cada fondo es una carpeta <basePath><versión>/<nombre>/ con las mismas 4 capas (ver README.txt ahí).
// Hay dos versiones del arte: 'backgrounds' (con bruma) y 'backgrounds_sin_bruma'; cada fondo elige la
// suya en BACKGROUND_SOURCES. Las salas eligen fondo con el campo `background` (lo dibuja ParallaxBackground).
export const BACKGROUND_SOURCES = {
  street: 'backgrounds', // con bruma
  park: 'backgrounds_sin_bruma',
  market: 'backgrounds_sin_bruma',
  construction: 'backgrounds', // con bruma
};
export const BACKGROUNDS = Object.keys(BACKGROUND_SOURCES); // orden del ciclo de F2

export const PARALLAX = {
  basePath: 'assets/', // relativa: Vite sirve public/ en la raíz y la copia a dist/
  groundLine: 256, // px, fila de las imágenes donde se apoya la base de las casas
  // checkBottom: en modo debug, avisar por consola si el borde inferior de la capa queda por encima del
  // de la pantalla. sky está fija en y = 0 y cubre toda la pantalla; clouds mide 270 y con el anclaje
  // su borde queda ~50 px arriba (avisaría todo el tiempo), pero es transparente abajo y far/mid, opacas,
  // la tapan. Las que importan son esas dos.
  layers: [
    { id: 'sky', file: 'layer_1_sky.png', factorX: 0, factorY: 0, checkBottom: false },
    { id: 'clouds', file: 'layer_2_clouds.png', factorX: 0.05, factorY: 0.05, checkBottom: false },
    { id: 'far', file: 'layer_3_far.png', factorX: 0.2, factorY: 0.2, checkBottom: true },
    { id: 'mid', file: 'layer_4_mid.png', factorX: 0.5, factorY: 0.5, checkBottom: true },
  ],
};

// --- Interacción ---
export const INTERACT_RADIUS = 28; // px, distancia (centro a centro, en X) para mostrar el indicador de interacción

// --- Controles ---
// Nombres de tecla de Phaser (Phaser.Input.Keyboard.KeyCodes). Cada acción acepta varias teclas.
export const CONTROLS = {
  left: ['A', 'LEFT'],
  right: ['D', 'RIGHT'],
  jump: ['SPACE', 'W', 'UP'],
  interact: ['S', 'DOWN'], // "abajo": como entrar/revisar, típico de plataformeros
  confirm: ['ENTER'],
  debug: ['F1'],
  cycleBackground: ['F2'], // debug: cambia el fondo de la sala entre los de BACKGROUNDS
};

// --- Profundidades de dibujo (mayor = encima) ---
export const DEPTH = {
  background: -100, // la capa i del parallax se dibuja en background + i (todas detrás de los tiles)
  tiles: 0,
  props: 10,
  player: 20,
  prompt: 30,
  ui: 100,
  debug: 200,
};

// --- Colores placeholder (greybox, tema oscuro) ---
export const COLORS = {
  background: 0x0b0d12,
  tile: 0x2f3542,
  tileEdge: 0x47505f,
  npc: 0xb48ead,
  outline: 0x000000, // borde de los personajes placeholder (para juzgar el contraste contra el fondo)
  hazard: 0xffd23f,
  phone: 0xd8dee9,
  phoneAccent: 0xe5484d,
  prompt: 0xf5f5f5,
  dialogBg: 0x11141b,
  dialogBorder: 0x8a94a6,
  text: '#e8ecf1',
  textDim: '#8a94a6',
  danger: '#ffd23f',
};

export const FONT = 'monospace';
