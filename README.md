# Corrientazo

Juego de plataformas 2D para navegador que divulga seguridad eléctrica: en cada habitación hay un peligro eléctrico y la forma correcta de resolverlo (no tocar, avisar, llamar a un técnico).

**Estado actual: fase 1, prototipo greybox.** Por ahora todo son rectángulos de colores. El código está armado para cambiar esos placeholders por sprites sin tocar la lógica.

## Cómo correrlo

Requisitos: Node 18 o superior.

```bash
npm install
npm run dev       # servidor de desarrollo en http://localhost:5173
npm run build     # build de producción en dist/
npm run preview   # sirve el build para probarlo
```

## Controles

| Acción | Teclas |
| --- | --- |
| Moverse | A / D, ← / → |
| Saltar (mantén para saltar más alto) | Espacio, W, ↑ |
| Interactuar / avanzar diálogo | E |
| Elegir personaje | ← / → y Enter |
| Modo debug (hitboxes + timer) | F1 |

## Stack

- [Phaser 4](https://phaser.io) con física Arcade.
- [Vite](https://vite.dev) como servidor de desarrollo y bundler.
- JavaScript con ES modules, sin TypeScript.
- Resolución interna de 480x270 con `pixelArt: true` y `roundPixels: true`. El canvas se amplía con un zoom **entero** (x1, x2, x3...), el más grande que quepa en la ventana, para que todos los pixeles queden del mismo tamaño.

## Estructura

```
src/
├── main.js                     Config de Phaser (render, escala, física) y lista de escenas
├── config/
│   └── constants.js            TODAS las constantes ajustables: movimiento, cámara, controles, colores
├── data/
│   ├── characters.js           Personajes seleccionables (nombre, color, key de textura)
│   └── rooms/
│       ├── index.js            Registro de habitaciones por id
│       └── testRoom.js         Habitación de prueba: layout + posiciones + diálogos
├── entities/
│   ├── Player.js               Jugador: aceleración, salto variable, coyote time, jump buffer
│   ├── Interactable.js         Objeto con indicador "E" (base del NPC y del teléfono)
│   ├── Npc.js                  NPC con diálogo que cambia según flags
│   └── Hazard.js               Obstáculo peligroso movido por tween
├── systems/
│   ├── Controls.js             Agrupa teclas por acción (jump = Espacio/W/↑)
│   ├── RoomBuilder.js          Convierte el layout de texto en tiles + colisiones fusionadas
│   ├── DialogBox.js            Caja de diálogo inferior que avanza con E
│   ├── RoomFlags.js            Flags por habitación (p. ej. "technicianCalled")
│   ├── PlayTimer.js            Timer global de juego
│   └── DebugOverlay.js         Panel F1: timer, posición, velocidad + hitboxes
└── scenes/
    ├── BootScene.js            Arranque
    ├── PreloadScene.js         Carga de assets (hoy genera las texturas placeholder)
    ├── CharacterSelectScene.js Selección de personaje (guarda la elección en el registry)
    ├── GameScene.js            Arma y corre una habitación a partir de sus datos
    └── GameOverScene.js        "¡CORRIENTAZO!" + tip; una tecla te devuelve al inicio de la sala
```

## Ajustar el movimiento ("game feel")

Todos los valores están en `src/config/constants.js`, en el objeto `MOVE`. Con `npm run dev` los cambios se recargan solos. Activa F1 para ver la velocidad y la posición mientras pruebas.

| Constante | Unidad | Qué hace | Si lo subes... |
| --- | --- | --- | --- |
| `maxSpeed` | px/s | Velocidad horizontal máxima | Corre más rápido |
| `accel` | px/s² | Aceleración en el suelo | Llega antes a la velocidad máxima (más "arcade") |
| `decel` | px/s² | Frenado en el suelo al soltar | Frena en seco; si lo bajas, patina |
| `turnAccel` | px/s² | Aceleración al cambiar de dirección | Giros más ágiles |
| `airAccel` / `airDecel` | px/s² | Lo mismo, pero en el aire | Más control en el aire |
| `gravity` | px/s² | Gravedad mientras sube | Saltos más bajos y más cortos |
| `fallGravityMultiplier` | × | Multiplica la gravedad al caer | Caída más rápida y salto más "pesado" |
| `maxFallSpeed` | px/s | Velocidad terminal de caída | Cae más rápido desde alturas grandes |
| `jumpVelocity` | px/s | Impulso del salto | Salta más alto |
| `jumpCutMultiplier` | × (0–1) | Al soltar el salto, la velocidad de subida se multiplica por esto | Menos diferencia entre un toque y mantener |
| `coyoteMs` | ms | Margen para saltar después de salir de un borde | Más permisivo |
| `jumpBufferMs` | ms | Margen para registrar un salto presionado antes de aterrizar | Más permisivo |

Regla útil: la altura máxima del salto es aproximadamente `jumpVelocity² / (2 · gravity)`. Con los valores actuales da unos 64 px (4 tiles). Las plataformas de la sala de prueba están separadas por 3 tiles. Si bajas el salto, revisa que se puedan seguir subiendo.

La cámara se ajusta en `CAMERA`:

- `lerpX` y `lerpY`: suavizado de la cámara. Con 1 sigue al jugador pegada; con valores más bajos lo sigue con más retraso.
- `deadzoneW` y `deadzoneH`: el tamaño de la zona central donde el jugador se mueve sin que la cámara reaccione.

## Editar o crear habitaciones

Cada sala es un archivo en `src/data/rooms/` y se registra en `index.js`.

- `layout` es un array de strings, una por fila. Cada carácter es un tile de 16x16: `#` es sólido y `.` está vacío. El tamaño de la sala sale del layout, así que puede ser más ancha o más alta que la pantalla. La cámara la sigue en los dos ejes y se detiene en los bordes. Si la sala es más chica que la pantalla, queda centrada.
- Las posiciones (`spawn`, `npc`, `phone`, `hazard`) van en tiles. `x` es la columna e `y` es la fila del tile sobre el que se apoya el objeto.
- Las colisiones se generan solas: los tiles sólidos contiguos se fusionan en rectángulos grandes, para que el jugador no se enganche en las uniones.
- Deja al menos 4 tiles de suelo bajo el piso más bajo de la sala. Si no, cuando la cámara está en el fondo, la caja de diálogo tapa al jugador.

## Flags y timer

- **Flags por habitación** (`RoomFlags`): describen el estado del mundo, como `technicianCalled`. Sobreviven a las muertes y se reinician al empezar una partida nueva desde la selección de personaje.
- **Timer global** (`PlayTimer`): cuenta el tiempo de juego en ms desde que eliges personaje. Sigue corriendo durante los diálogos y se pausa en GameOver y en los menús. Las muertes no lo reinician. Por ahora solo se ve en el modo debug (F1).

## Cambiar placeholders por arte

Las entidades solo conocen *keys* de textura: `player-0..2`, `tile`, `npc`, `hazard`, `phone` y `prompt-e`. Hoy `PreloadScene` las dibuja con `Graphics.generateTexture`. Para meter arte:

1. Pon los archivos en `public/assets/`.
2. En `PreloadScene`, reemplaza el `make(...)` de esa key por `this.load.image(key, ...)` o por `this.load.spritesheet(key, ...)`, en un `preload()`.
3. Si el sprite tiene un tamaño distinto al hitbox, ajusta el body con `setSize` / `setOffset` en la entidad. Las animaciones irían en `Player`.

## Fuera de alcance por ahora

Arte, audio y leaderboard.
