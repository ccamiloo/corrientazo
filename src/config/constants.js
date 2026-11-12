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
  // ms que el personaje queda en el frame chamuscado (último de 'shock') antes de pasar a Game Over.
  // Sin esta pausa el frame duraría solo 1/10 s (lo que dura un frame a 10 fps) y casi no se leería.
  burntHoldMs: 800,
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
  house: 'backgrounds', // amanecer del nivel 1 (solo existe en esta carpeta)
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

// --- NPCs con arte ---
export const NPC = {
  // px (centro a centro, en X) a los que un NPC "nota" al jugador: deja lo que hace y lo mira.
  // Algo más que INTERACT_RADIUS para que se gire antes de que aparezca el indicador.
  noticeRadius: 48,
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
  devMenu: ['F3'], // desarrollo: abre el menú de salas (solo si DEV.menu)
};

// --- Desarrollo ---
// TEMPORAL: interruptores de herramientas de desarrollo. Al terminar el juego, ponerlos en false.
export const DEV = {
  // F3 abre el menú para entrar directo a cualquier sala (DevMenuScene). Solo en `npm run dev`: en el build los
  // niveles se juegan en orden, sin saltos.
  menu: import.meta.env.DEV,
};

// --- Nivel 2: cable culebra ---
// Péndulo anclado a la punta del poste. El largo no es constante: lo calcula la sala para que la punta
// toque el suelo justo en la parte baja del arco (largo = suelo - ancla).
// El ángulo sigue θ(t) = amplitud · sen(2π t / periodo): es determinista, así que los charcos pueden
// "predecir" cuándo se electrifican para avisar antes.
export const CABLE = {
  amplitudeDeg: 40, // grados a cada lado de la vertical
  // s, ida y vuelta completa. Medido con un bot que cruza por la banca: con 3 s el cruce es imposible,
  // con 4 s las ventanas son de 0.3 s (saltar del carro) y 0.6 s (arrancar desde la banca); con 4.5 s, 0.6 y 0.8.
  // Subido a 6 s por feedback de jugadores (4.5 s se sentía demasiado difícil): ventanas ~33% más largas.
  periodS: 6,
  // "Parte baja del arco": mientras |θ| sea menor que esto, la punta está tocando el charco y lo electrifica.
  // 12° ≈ la punta a menos de 4 px del suelo con el ancla a 12 tiles.
  lowArcDeg: 12,
  hitMarginPx: 2, // px que se le recortan por lado al hitbox del jugador contra el cable (rozar no mata)
  thicknessPx: 2, // px, grosor del cable (dibujo y colisión)
  settleMs: 900, // ms que tarda en quedar colgando quieto al cortar la luz
  sparkCount: 5, // chispas por frame en la punta
  sparkRadiusPx: 6, // px, radio alrededor de la punta en el que aparecen
};

// --- Nivel 2: charcos ---
// La corriente sale del charco que toca el cable y viaja por el grafo de charcos conectados:
// un charco a n saltos se electrifica hopDelayS · n segundos después que el de origen ("ola").
export const PUDDLE = {
  hopDelayS: 0.25, // s de retraso por cada conexión entre charcos
  warnS: 0.4, // s que titila antes de electrificarse
  edgeMarginPx: 4, // px: pisar el borde del charco con menos de esto no mata (se siente más justo)
  heightPx: 3, // px, alto del dibujo del charco sobre el suelo
  flickerMs: 80, // ms entre destellos del aviso (alterna las filas warn y off del arte)
  liveFlickerMs: 100, // ms entre las dos filas del arte electrificado (live_a / live_b)
  // Posición del arte respecto a la superficie del charco (en street_1, superficie 208 → piezas desde y = 207 y
  // chorritos en y = 213, como pide el README del arte): el agua va sobre la cara de arriba de la calle.
  pieceOffsetY: -1, // borde de arriba de las piezas de 16x7
  streamOffsetY: 5, // línea de 1 px de los chorritos
  streamOff: 0x5aa6de,
  streamLive: 0xffd43a,
};

// --- Nivel 3 (parque): viento ---
// Ciclo calma → aviso → ráfaga (periodo calmS + warnS + gustS = 6.2 s), con el reloj propio de la sala.
// Sopla hacia la IZQUIERDA y solo empuja al jugador en el aire: su velocidad x final = la de la entrada
// + airPushX. Un salto plano en ráfaga recorre (130 - 100) px/s · 0.67 s ≈ 20 px en vez de ~88.
export const WIND = {
  calmS: 3.0,
  warnS: 1.0,
  gustS: 2.2,
  airPushX: -100, // px/s, solo en el aire
  // Visual: rayitas que cruzan la pantalla de derecha a izquierda (por segundo, en cada fase).
  streaksPerS: { calm: 0, warn: 10, gust: 34 },
  streakSpeed: 420, // px/s
  sockLiftDeg: { calm: 0, warn: 50, gust: 90 }, // greybox: ángulo de la manga respecto a colgar vertical
  // Arte de la manga (windsock, 24x24): par de frames por fase, alternados para que ondee.
  sockFrames: { calm: [0, 1], warn: [2, 3], gust: [4, 5] },
  sockFlapMs: 250,
};

// --- Nivel 3: columpio (plataforma móvil, no depende del viento) ---
export const SWING = {
  amplitudeDeg: 40,
  periodS: 3.0,
  seatW: 24, // px; sólido solo por arriba
  seatH: 4,
};

// --- Nivel 3: chispas del árbol (caen de los puntos de contacto con la línea durante la ráfaga) ---
export const TREE_SPARK = {
  everyS: 0.12, // una chispa por punto de contacto cada tanto
  fallSpeed: 180, // px/s hacia abajo
  driftX: -40, // px/s (el viento las corre a la izquierda)
  jitterPx: 6, // ± px al azar en x al salir
  size: 4, // px, hitbox cuadrada
  flashMs: 180, // chispazo en el punto de contacto al empezar la ráfaga
};

// --- Nivel 3: hilos de cometa (Cable con otra función de ángulo; ver src/entities/KiteString.js) ---
export const KITE_STRING = {
  trembleDeg: 3, // en el aviso
  trembleHz: 6, // ciclos enteros en el segundo de aviso: así termina en 0° justo al empezar la ráfaga
  gustDeg: -40, // en la ráfaga sube hacia la izquierda hasta aquí
  // Subida: resorte críticamente amortiguado θ = θg + (θ0 - θg)(1 + ωt)e^(-ωt). Sin rebote; con ω = 11 rad/s
  // queda a menos de 1° de -40° a los 0.5 s.
  riseOmega: 11,
  // Vuelta a 0° al acabar la ráfaga: resorte subamortiguado de periodo natural 1 s y ζ = 0.35
  // (primer rebote ≈ 40° · e^(-ζπ/√(1-ζ²)) ≈ 12.4°, y a los 1.5 s queda en ~1.5°).
  releasePeriodS: 1.0,
  releaseZeta: 0.35,
  thicknessPx: 1,
  hitMarginPx: 2, // como el cable: rozar no mata
  // Moños de la cola: cada bowEveryPx empezando a bowStartPx del ancla, bowWidthPx de ancho y
  // perpendiculares al hilo, alternando los colores de bowColors.
  bowEveryPx: 24,
  bowStartPx: 12,
  bowWidthPx: 5,
  bowColors: [0xe05a45, 0xf2c94c, 0x4f8fbf],
};

// --- Nivel 3: pasto electrificado (zonas fijas alrededor de los faroles destapados) ---
export const GRASS = {
  flickerMs: 120, // alterna los frames A y B del arte (o titila el greybox)
  pieceOffsetY: -8, // borde de arriba de las piezas de 16x10 respecto a la superficie (208 → y = 200)
};

// --- Nivel 1: salida de la casa ---
export const HOUSE = {
  exitFadeMs: 500, // fundido a negro hacia la calle
};

// --- Nivel 3: fin del nivel ---
export const PARK = {
  endHoldMs: 3500, // ms que se ve el cartel de fin antes de pasar al mercado
  exitFadeMs: 500, // fundido a negro hacia el mercado
};

// --- Nivel 4 (mercado): congelador ---
// Reloj del mercado (src/systems/MarketPower.js): apagado → aviso → prendido (periodo 5.2 s). Charcos, enganches y
// lata del mostrador siguen este reloj; el pulpo tiene el suyo.
export const MARKET_POWER = {
  offS: 2.6,
  warnS: 0.8,
  onS: 1.8,
  lightBlinkMs: 100, // la luz del congelador titila en el aviso
};

// --- Nivel 4: enganches pelados (segmentos que matan con el congelador prendido) ---
export const HOOKUP = {
  thicknessPx: 2,
  hitMarginPx: 2, // como el cable: rozar no mata
  blinkMs: 100, // titila en el aviso
  // Con el arte de la sala: cobre pelado apagado, amarillo prendido (en el greybox, COLORS.hookupOff/Live).
  artOff: 0xb87333,
  artLive: 0xffe14a,
  // Chispas (hookup_spark) por tramo prendido: 3 si el tramo mide al menos esto, si no 2.
  sparkLongPx: 70,
};

// --- Nivel 4: toldos (sólidos solo por arriba, rebotan) ---
// Rebote: vy = bounceVy al caer encima. Altura ≈ 430² / (2 · 900) ≈ 102 px (6.4 tiles).
export const AWNING = {
  bounceVy: -430,
  sagPx: 2, // se hunde al rebotar...
  sagMs: 120, // ...durante este tiempo
};

// --- Nivel 4: carretilla ---
export const CART = {
  w: 32,
  h: 16,
  speed: 70, // px/s
  pushExtra: 40, // px/s que se suman a la velocidad de la carretilla al empujar al jugador
  pushMs: 250,
};

// --- Nivel 4: el pulpo (multitoma sobrecargada), con su propio ciclo ---
export const PULPO = {
  pauseS: 2.4,
  warnS: 0.6, // se pone rojo y echa humo
  burstS: 0.9, // suelta chispas
  everyS: 0.08,
  angleMinDeg: 100, // 0° = derecha, 90° = arriba: 100-165° es hacia arriba a la izquierda
  angleMaxDeg: 165,
  speedMin: 200,
  // Medido con 5000 chispas simuladas: con 360 (el valor del diseño) ninguna pasa por encima de la columna de 6 cajas
  // (cols 93-94, techo en y = 112) y el pulpo no amenaza la subida. Con 440, el 8 % de las chispas llega a la cima
  // (≈ 64 % de que alguna lo haga en cada ráfaga), así que hay que subir en la pausa.
  speedMax: 440,
  gravity: 600, // px/s²
  size: 4, // hitbox de la chispa
  smokeMs: 1500, // humito que se va al bajar el taco
};

// --- Nivel 4: fin ---
export const MARKET = {
  endHoldMs: 3500, // ms del cartel de fin antes de pasar a la obra
  exitFadeMs: 500, // fundido a negro hacia la obra
};

// --- Nivel 5 (obra): línea de alta tensión, siempre letal ---
// Segmento horizontal de lado a lado de la sala (la altura está en construction.js, powerLine.y).
export const POWER_LINE = {
  thicknessPx: 2,
  hitMarginPx: 2, // como los enganches: el hitbox se recorta (hitMargin - grosor/2) px por lado
};

// --- Nivel 5: mezcladora (reloj del concreto fresco) ---
// apagada → aviso → girando (ciclo de 3.85 s). El concreto C1/C2 mata girando, como los charcos.
export const MIXER = {
  offS: 2.0,
  warnS: 0.45,
  onS: 1.4,
  // Pisar el borde con menos de esto no mata. 8 = medio hitbox: mata cuando el CENTRO del jugador está sobre el
  // concreto. Medido con el bot: los sacos están 32 px más arriba, así que el salto de C1 a los sacos rinde ~76 px y
  // exige despegar con el borde derecho en x ≥ 210; con 4 (el de los charcos) el concreto vivo mataba desde 212 y la
  // ventana era de 2 px (menos de un frame). Con 8 queda de 210 a 216.
  edgeMarginPx: 8,
  shakePx: 1, // temblor de la mezcladora en el aviso
  spinRps: 1.5, // vueltas por segundo del tambor girando (greybox)
  blinkMs: 90,
};

// --- Nivel 5: arcos del andamio ---
// Secuencia de ida y vuelta por los tramos del tablón de arriba (S1 S2 S3 S4 S3 S2 S1 S2...). Cada paso dura
// warnS + arcS: el tramo de turno avisa (brilla y chisporrotea la línea encima) y después le cae el arco.
export const SCAFFOLD_ARC = {
  warnS: 0.35,
  arcS: 0.2,
  blinkMs: 70,
};

// --- Nivel 5: grúa ---
// Carro: va y viene entre trolleyMinX y trolleyMaxX (construction.js). Carga: ciclo vertical propio.
export const CRANE = {
  trolleySpeed: 55, // px/s
  upS: 1.4, // carga arriba
  lowerS: 0.5, // bajando
  downS: 0.9, // abajo (tapa el paso sobre la losa)
  raiseS: 0.5, // subiendo
  loadW: 40,
  loadH: 8,
  hitMarginPx: 2, // carga y cable del gancho, como los enganches
  boomSparkMinS: 1.2, // chispas decorativas entre la pluma y la línea, cada tanto (azar con semilla)
  boomSparkMaxS: 3.0,
  boomSparkMs: 160,
};

// --- Nivel 5: onda de la viga ---
// aviso (chispas en el extremo derecho) → viaje → pausa (ciclo de 3.56 s). El viaje dura lo que tarda la franja
// en recorrer la viga a `speed`: (1680 - 1296) / 150 = 2.56 s.
export const BEAM_WAVE = {
  warnS: 0.4,
  pauseS: 0.6,
  speed: 150, // px/s, hacia la izquierda
  widthPx: 48,
  edgeMarginPx: 2, // el hitbox debe meterse más de esto en la franja para que mate
};


// --- Música ---
// Una pista por "momento" del juego, siempre en loop. Los archivos viven en public/assets/music/
// (copias de media/music/). Music.play no reinicia la pista si ya está sonando, así que pasar de la
// selección de personaje al menú de desarrollo (ambos 'menus') no la corta.
export const MUSIC = {
  volume: 0.5,
  basePath: 'assets/music/',
  tracks: {
    menus: 'menus.mp3', // selección de personaje y menú de desarrollo
    playing: 'playing.mp3', // jugando (GameScene)
    gameover: 'gameover.mp3', // pantalla de Game Over
  },
};

// --- Profundidades de dibujo (mayor = encima) ---
export const DEPTH = {
  background: -100, // la capa i del parallax se dibuja en background + i (todas detrás de los tiles)
  interior: -50, // pared interior de las salas techadas: delante del fondo, detrás de los tiles
  tiles: 0, // las decoraciones del layout (columnas) van en tiles - 1
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
  step: 0x3b4252, // escalones (E)
  roof: 0x5c4b3b, // techo de la terraza (T)
  column: 0x8f8f8f, // columnas del techo (|)
  interior: 0x1c1f27, // pared del fondo dentro de la casa
  door: 0x8b5a2b,
  doorOpen: 0x14161c, // vano de la puerta abierta
  applianceOff: 0x5a5f69,
  outline: 0x000000, // borde de los personajes placeholder (para juzgar el contraste contra el fondo)
  hazard: 0xffd23f,
  phone: 0xd8dee9,
  phoneAccent: 0xe5484d,
  prompt: 0xf5f5f5,
  dialogBg: 0x11141b, // fondo de las cajas: diálogo, avisos del tutorial, HUD, debug
  dialogBorder: 0x8a94a6,
  // Nivel 2 (calle)
  car: 0xa3423c, // C
  bench: 0x8b6a3e, // B
  planter: 0x5b8a3c, // M
  curb: 0x737985, // A (andén)
  stopSign: 0x3f7fa8, // S (cartelera del paradero)
  stopRoof: 0x4c566a, // T del paradero (la casa usa roof)
  pole: 0x6b6b6b, // P
  shop: 0x232833, // fachada de la tienda (fondo)
  shopAwning: 0xb85c38,
  manhole: 0x3b3f47,
  cable: 0x2b2638, // línea del cable (README del arte de street_1)
  spark: 0xffe066,
  puddle: 0x3d74d6,
  puddleFlash: 0xd6ecff,
  puddleLive: 0xffd23f,
  puddleZigzag: 0x0b0d12,
  // Nivel 3 (parque)
  grass: 0x3f7a3a, // '#' pasto
  tower: 0x7d5a9c, // H torres de los juegos
  bridge: 0x9c7a4a, // R puente
  lamp: 0x3d4a3d, // L farol
  sockPole: 0x9aa0a8, // W asta de la manga
  sock: 0xe0603a, // manga de viento
  trunk: 0x6b4a2b, // T tronco
  canopy: 0x3e7d3a, // copa del árbol (greybox)
  liveGrass: 0xffd23f,
  kite: 0xf28ab2, // cometa de Tomás
  oldKite: 0x8f8a86, // cometa vieja rota
  powerLine: 0x2b2638,
  kiteString: 0xf4f1ea,
  swingSeat: 0xa36a3a,
  swingFrame: 0x5a6b7a,
  chain: 0x8e8a9c, // cadena del columpio (README del arte del parque)
  windStreak: 0xe8f4ff,
  // Nivel 4 (mercado)
  floorTile: 0xb9a98c, // '#' baldosa
  crate: 0x9a6b3c, // K cajas
  fruitStall: 0x5f8f3a, // F techo del puesto de frutas
  wood: 0x8a5a2e, // M mostrador de madera
  metal: 0x8d939c, // m mostrador de lata
  freezer: 0xdfe6ec,
  freezerLight: 0xe5484d,
  hum: 0xfff3b0, // ondas de zumbido del congelador
  dirtyCable: 0x2d2a30, // manojo de enganches (decorativo)
  hookupOff: 0x7a7f88,
  hookupLive: 0xffd23f,
  tape: 0x3a3a3a, // cinta del empalme
  awning: 0x3f88c5,
  awningStripe: 0xf2f2f2,
  cart: 0x8b5a2b,
  wheel: 0x2b2b2b,
  pulpo: 0xd8433a,
  smoke: 0x9aa0a8,
  breaker: 0x5a5f69,
  vendedor: 0x6aa84f,
  carmen: 0xc27ba0,
  // Nivel 5 (obra)
  siteGround: 0x8a7a63, // '#' suelo de obra
  sack: 0xc9bfa8, // S sacos de cemento
  plank: 0xa87a45, // T tablón del andamio
  concrete: 0x9a9d9f, // E concreto
  rebar: 0x7a4a2a, // varillas (mochos y carga de la grúa)
  beam: 0x5d6b7a, // V viga de acero
  hvLine: 0x6b1f22, // línea de alta tensión (rojo oscuro)
  insulator: 0xd8dee9,
  wetConcrete: 0x6f7375,
  liveConcrete: 0xffd23f,
  mixer: 0xe08a2e,
  crane: 0xe0b12e,
  arc: 0xf4f7ff,
  arcGlow: 0x9fd3ff,
  wave: 0xffd23f,
  helmet: 0xffd23f,
  helmetLit: 0xfff3b0,
  maestro: 0x4f7fb0,
  ingeniera: 0xe07a5f,
};

// --- Interfaz: fuente pixel, colores de texto y menús ---
// La fuente es BitmapText ('pixel', public/assets/fonts/): tamaño nativo 11, interlineado 12. Solo escala entera.
// Los glyphs son blancos y se tiñen (ver src/systems/pixelText.js).
export const UI = {
  font: 'pixel',
  fontSize: 11,
  outline: 0x2b1e2e, // contorno de 1 px del texto (y borde de los pedestales)
  white: 0xffffff,
  yellow: 0xffe45c, // títulos y opción seleccionada
  lightYellow: 0xfff3b0, // "Enter o clic para jugar"
  dim: 0x9aa3b5, // textos secundarios (menú de desarrollo, ayudas)
};

// Pantalla de Game Over (public/assets/ui/gameover/README_v2.txt y docs/mockups/mockup_gameover_v2_x3.png).
// Posiciones en px de pantalla (480x270); tiempos en ms.
export const GAME_OVER = {
  inputDelayMs: 400, // antes de aceptar teclas: la tecla con la que chocó no salta la pantalla
  saturation: 0.15, // saturación de la sala congelada de fondo (1 = original)
  paperColor: 0xf2ede4, // velo "papel" encima de la sala desaturada: aclara, no oscurece
  paperAlpha: 0.18,
  flashMs: 80,
  shakeMs: 180,
  shakeIntensity: 0.006, // fracción del tamaño de la cámara (≈ 3 px en x)
  pop: { x: 240, y: 124, inMs: 120 },
  character: { x: 240, feetY: 172, scale: 3, shockMs: 700, shockStepMs: 80 },
  smoke: { everyMs: 350, xMin: 228, xMax: 252, y: 80, rise: 20 },
  title: { x: 107, y: 8, introMs: 500, stepMs: 60, twitchEveryMs: 2500, twitchMs: 200 },
  card: { x: 50, y: 176, fromY: 290, slideMs: 250, textDx: 12, textDy: 24, textMaxWidth: 356 },
  badge: { x: 12, y: 12, textX: 34, textY: 15 },
  hint: { x: 240, y: 254, stepMs: 450 },
};

// Comanda del nombre y tabla de tiempos (public/assets/ui/results/README.txt; mockups en docs/mockups/, a x3).
// Posiciones en px de pantalla (480x270), esquina arriba a la izquierda salvo que se diga otra cosa.
export const RESULTS = {
  dimColor: 0x141022, // la calle de la selección, oscurecida
  dimAlpha: 150 / 255,
  ink: 0x2b1e2e, // texto sobre papel (comanda)
  footer: 0xfff3b0,
  name: {
    ticket: { x: 196, y: 70 }, // ne_ticket.png, 232x136
    text: { x: 212, y: 127, ySmall: 133, maxWidthScale2: 196 }, // escala 2; si no cabe, escala 1 en ySmall
    cursor: { y: 129, w: 2, h: 18, color: 0xd9483b, gap: 2, blinkMs: 400 },
    counter: { right: 412, y: 110, color: 0x7a6a5e },
    head: { x: 268, y: 160 },
    charName: { x: 292, y: 164 },
    character: { x: 84, feetY: 178 }, // x2; el sprite de 48 px empieza en x 60 (mockup)
    pedestal: { x: 64, y: 178, scale: 2 },
    titleY: 22,
    footer: { leftRight: 228, rightLeft: 252, y: 236 },
    stampScale: 1.1,
    stampMs: 100,
    startDelayMs: 250, // ms entre el sello y el arranque del juego
    // Táctil: el <input> HTML invisible cubre la comanda entera (ne_ticket.png, 232x136); el pie va alineado a
    // la derecha en footerRight y el botón "Listo" (centro x, y; w x h) a su derecha.
    touch: { ticketW: 232, ticketH: 136, footerRight: 330, done: { x: 380, y: 241, w: 60, h: 24 } },
  },
  board: {
    x: 10, // lb_board.png, 296x254
    y: 8,
    rowY0: 66,
    rowH: 18,
    rows: 10,
    medal: { x: 24, dy: 2 },
    rank: { right: 36, color: 0xc4d2c8 },
    head: { x: 42, w: 20, h: 16 },
    name: { x: 68, dy: 2 },
    time: { right: 246, dy: 2 },
    bolt: { x: 254, dy: 3 },
    deaths: { x: 265, dy: 2 },
    color: 0xf0ece2,
    hi: { x: 17, dy: -1, blinkMs: 400 },
    statusY: 150, // "Cargando..." / "Sin conexión", centrado en el tablero
  },
  card: {
    x: 316, // lb_card.png, 156x204
    y: 8,
    character: { x: 368, y: 34 }, // x2, esquina
    name: { cx: 392, y: 112, maxWidth: 150 },
    right: 458,
    timeY: 136,
    rankY: 158,
    deathsY: 180,
    boltGap: 10,
  },
  footerX: 392, // "Presiona cualquier tecla", centrado
  footerY: 236,
  inputDelayMs: 300, // en la tabla: margen antes de aceptar teclas
};
// Escena final en el restaurante de la Seño (public/assets/ui/ending/README.txt; docs/mockups/mock_final_*.png).
// Posiciones en px de pantalla; "esquina" = arriba a la izquierda. Comida, bandeja, vapor, confeti y personajes van a
// escala 2 (sprites de media resolución). Tiempos en ms desde que arranca la escena.
export const ENDING = {
  fadeMs: 300, // fundido a negro al salir del juego y fundido de entrada aquí
  seno: { x: 290, feetY: 222 }, // origen abajo al centro, flipX (mira a la izquierda)
  player: { fromX: -30, toX: 96, feetY: 250, walkMs: 1600 },
  tray: { x: 150, y: 194 },
  food: { x: 146, dx: 20, y: 170, popFrom: 1.4, popMs: 120 }, // frame i en (x + i·dx, y)
  steam: { x: 154, y: 150 },
  tick: { x: 22, y: 117, dy: 12, popMs: 160 },
  title: { x: 107, fromY: -60, y: 6, dropMs: 700 },
  banner: { cx: 240, y: 56, growMs: 200 },
  receipt: { fromX: 490, x: 330, y: 72, slideMs: 300 },
  receiptText: { name: { x: 338, y: 122 }, right: 462, timeY: 205, deathsY: 218, color: 0x2b1e2e },
  stamp: { x: 376, y: 146, fromScale: 2, slamMs: 90, atMs: 600 },
  hint: { x: 67, y: 252, stepMs: 450, atMs: 900 },
  bubble: { cx: 300, bottom: 150, maxWidth: 150, padX: 6, padY: 4, fill: 0xfffaf0 },
  // Fases (inicio de cada una).
  serveAt: 2200, // la Seño habla
  platesAt: 2800, // empieza a servir
  plateEveryMs: 450,
  partyAt: 5000, // ¡CORRIENTAZO!
  billAt: 7500, // la cuenta
  flashMs: 80,
  shakeMs: 150,
  shakeIntensity: 0.006,
  cheerStepMs: 260, // la Seño alterna los brazos con un saltito
  cheerHopPx: 4,
  playerHops: 2,
  playerHopPx: 24,
  playerHopMs: 420, // un salto completo (sube y baja)
  confetti: { count: 60, emitMs: 2000, fallMin: 60, fallMax: 110, swayPx: 10, spinMax: 6 },
  inputDelayMs: 400, // en la cuenta: margen antes de aceptar la tecla que lleva a la tabla
};

// Tabla de tiempos (Firestore): límites que exigen las reglas publicadas en la consola. Si cambian allá, cambiarlos
// aquí; Leaderboard.submitScore valida con esto antes de mandar (lo que no cumpla, las reglas lo rechazarían).
export const LEADERBOARD = {
  minTimeMs: 30000, // 30 s
  maxTimeMs: 36000000, // 10 h
};

// Orden de las cabecitas en lb_heads.png (5 frames de 20x18).
export const HEADS = ['moises', 'camilo', 'evelyn', 'sebastian', 'danna'];

// Pantallas de menú (título y selección) sobre el parallax de la calle.
export const MENU = {
  // y de pantalla donde se paran los personajes: el borde de arriba del andén que viene dibujado en la capa
  // 'mid' del fondo. Medido en los mockups (docs/mockups, a x3): andén en y ≈ 733/3.
  groundY: 245,
  // Fila de la capa 'mid' donde empieza el andén (la imagen trae casas hasta la 256 y el andén debajo).
  sidewalkRow: 258,
  scrollSpeed: 12, // px/s del fondo de la pantalla de título (factor 1; cada capa lo multiplica por el suyo)
  logoFloatMs: 1400, // ms de un vaivén (sube 1 px y vuelve)
  buttonPressMs: 140, // ms que se ve el botón presionado antes de pasar a la selección
  duskColor: 0x1a2350, // overlay de "atardecer" de la selección
  duskAlpha: 0.55,
  pedestal: { color: 0xd88a4a, mortar: 0xa8602f, light: 0xf2b27a, w: 40, h: 14 },
};

// Caja de diálogo: efecto de máquina de escribir.
export const DIALOG = {
  charsPerSecond: 45, // letras por segundo; interactuar mientras se escribe completa la línea
  // Modo automático (avisos que no detienen el juego): cada línea, ya escrita, queda en pantalla
  // autoHoldBaseMs + autoHoldPerCharMs por letra antes de pasar sola (≈ 5 s para una línea de 110 letras).
  autoHoldBaseMs: 1400,
  autoHoldPerCharMs: 32,
};
