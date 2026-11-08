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

// --- Cámara ---
export const CAMERA = {
  lerpX: 0.15, // 0..1, suavizado horizontal (1 = sigue pegada, más bajo = más suave)
  lerpY: 0.12, // 0..1, suavizado vertical
  deadzoneW: 32, // px, zona central donde el jugador se mueve sin que la cámara reaccione
  deadzoneH: 48, // px, idem en vertical; absorbe micro-variaciones de Y y evita temblor
};

// --- Fondo con parallax ---
// Capas de fondo, de atrás hacia adelante. Cada una es un TileSprite del tamaño de la pantalla fijo
// a la cámara; en update se desplaza su textura según cámara.scrollX * factor.
//   factor 0   → no se mueve (cielo, "infinitamente lejos")
//   factor 1   → se movería igual que el mundo
// Las capas de 960 px se repiten sin costura, así que sirven para salas de cualquier ancho.
// Solo hay parallax horizontal: en vertical las capas quedan alineadas con la pantalla.
export const PARALLAX = {
  basePath: 'media/backgrounds/calle/',
  layers: [
    { key: 'bg-sky', file: 'layer_1_sky.png', factor: 0 },
    { key: 'bg-clouds', file: 'layer_2_clouds.png', factor: 0.05 },
    { key: 'bg-far', file: 'layer_3_far.png', factor: 0.2 },
    { key: 'bg-mid', file: 'layer_4_mid.png', factor: 0.5 },
  ],
};

// --- Interacción ---
export const INTERACT_RADIUS = 28; // px, distancia (centro a centro, en X) para mostrar la "E"

// --- Controles ---
// Nombres de tecla de Phaser (Phaser.Input.Keyboard.KeyCodes). Cada acción acepta varias teclas.
export const CONTROLS = {
  left: ['A', 'LEFT'],
  right: ['D', 'RIGHT'],
  jump: ['SPACE', 'W', 'UP'],
  interact: ['E'],
  confirm: ['ENTER'],
  debug: ['F1'],
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
