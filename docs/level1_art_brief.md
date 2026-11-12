# Brief de arte: nivel 1, la casa (`house`)

Fuente de verdad: `src/data/rooms/house.js`. Si este documento y ese archivo difieren, manda el archivo.

## 1. Layout

Tal como está en el archivo (29 filas de 60 caracteres, de arriba hacia abajo):

```
............................................................
..............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT..............
..............|...............|..............|..............
..............|...............|..............|..............
..............|...............|..............|..............
..............|...............|..............|..............
..............|...............|..............|..............
..............|...............|..............|..............
..............|...............|..............|..............
##.........#################################################
#..........................................................#
#.....EEEE.................................................#
#..........................................................#
#EEE.......................................................#
#EEE.......................................................#
#EEEEEEE...................................................#
#EEEEEEE...................................................#
#######################################.........############
#..........................................................#
#.......................................EEEE...............#
#..........................................................#
#.............................................EEE..........#
#.............................................EEE..........#
#.........................................EEEEEEEEE........#
#.........................................EEEEEEEEE........#
############################################################
############################################################
############################################################
############################################################
```

La misma grilla con número de fila a la izquierda y regla de columnas arriba (decenas en la primera línea, unidades en la segunda), solo para ubicarse:

```
     000000000011111111112222222222333333333344444444445555555555
     012345678901234567890123456789012345678901234567890123456789
  0  ............................................................
  1  ..............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT..............
  2  ..............|...............|..............|..............
  3  ..............|...............|..............|..............
  4  ..............|...............|..............|..............
  5  ..............|...............|..............|..............
  6  ..............|...............|..............|..............
  7  ..............|...............|..............|..............
  8  ..............|...............|..............|..............
  9  ##.........#################################################
 10  #..........................................................#
 11  #.....EEEE.................................................#
 12  #..........................................................#
 13  #EEE.......................................................#
 14  #EEE.......................................................#
 15  #EEEEEEE...................................................#
 16  #EEEEEEE...................................................#
 17  #######################################.........############
 18  #..........................................................#
 19  #.......................................EEEE...............#
 20  #..........................................................#
 21  #.............................................EEE..........#
 22  #.............................................EEE..........#
 23  #.........................................EEEEEEEEE........#
 24  #.........................................EEEEEEEEE........#
 25  ############################################################
 26  ############################################################
 27  ############################################################
 28  ############################################################
```

## 2. Leyenda

| Carácter | Qué es | Colisión |
|---|---|---|
| `#` | Estructura: muros laterales, losas entre pisos y suelo | Sólido por los cuatro lados |
| `E` | Escalón (incluye los dos flotantes, A3 y B3) | Sólido por los cuatro lados |
| `T` | Techo de la terraza | Sólido por los cuatro lados |
| `\|` | Columna que sostiene el techo | Decorativo, sin colisión: el jugador pasa por delante |
| `.` | Vacío (aire, interior de la casa o cielo según la zona) | Sin colisión |

No hay plataformas de un solo sentido: todo lo sólido bloquea también desde abajo. En particular, los escalones flotantes A3 y B3 golpean la cabeza si se salta por debajo de ellos, así que no conviene dibujarlos como repisas finas que parezcan atravesables.

## 3. Dimensiones

- Tile: 16 x 16 px.
- Sala: 60 x 29 tiles = **960 x 464 px**.
- Pantalla del juego: 480 x 270 px (se ve media sala de ancho y poco más de la mitad de alto). Se escala por un entero, con filtrado NEAREST.
- Personaje jugable: hitbox de 16 x 32 px; el sprite de Moisés mide 24 x 32 px (la hitbox va centrada).

## 4. Entidades

Convenciones del archivo:
- `x` = columna; `y` = fila del tile **sobre el que se apoya**. Es decir, la coordenada es la de **los pies**: centro horizontal de la columna (`x · 16 + 8`) y borde superior de la fila (`y · 16`).
- Todas las entidades se dibujan con origen **abajo al centro** (en los pies), salvo la puerta, cuyo `x` es la **columna izquierda**.
- Los tamaños son los de los placeholders actuales. El arte puede cambiarlos, pero conviene que los objetos sigan apoyados en el mismo punto.

| Entidad | Tiles (x, y) | Pies en px (x, y) | Tamaño placeholder | Esquina sup. izq. en px | Piso |
|---|---|---|---|---|---|
| Spawn del jugador | (30, 17) | (488, 272) | 16 x 32 (hitbox) | (480, 240) | 2 |
| Papá | (24, 25) | (392, 400) | 16 x 28 | (384, 372) | 1 |
| Abuela | (24, 9) | (392, 144) | 16 x 28 | (384, 116) | 3 (bajo el techo) |
| Radio | (38, 9) | (616, 144) | 14 x 10 | (609, 134) | 3 |
| TV | (21, 17) | (344, 272) | 22 x 16 | (333, 256) | 2 |
| Consola | (24, 17) | (392, 272) | 14 x 6 | (385, 266) | 2 |
| Cargador | (34, 17) | (552, 272) | 6 x 10 | (549, 262) | 2 |
| Licuadora | (8, 25) | (136, 400) | 10 x 18 | (131, 382) | 1 (cocina) |
| Puerta | cols 57-58, apoyada en la fila 25, 2 x 3 tiles | centro abajo (928, 400) | 32 x 48 | (912, 352) | 1 |

La puerta tiene dos estados: cerrada (bloquea el paso) y abierta (vano que se cruza caminando). Los aparatos tienen dos estados: encendido y desconectado (hoy el placeholder pasa a gris). Sobre cada objeto con el que se puede interactuar aparece un indicador de 11 x 11 px, unos 10 px por encima de su borde superior.

## 5. Pisos

| Piso | Losa / suelo (fila de apoyo) | Superficie en px (y) | Alto libre | Filas libres |
|---|---|---|---|---|
| 3, terraza | fila 9 | 144 | 7 tiles bajo el techo (filas 2-8); al aire libre fuera del techo (filas 0-8) | 2-8 |
| 2, habitación | fila 17 | 272 | 7 tiles = 112 px | 10-16 |
| 1, sala y cocina | filas 25-28 (suelo de 4 filas) | 400 | 7 tiles = 112 px | 18-24 |

- **Techo de la terraza:** fila 1, columnas 14-45 (x 224-736, y 16-32).
- **Columnas:** columnas 14, 30 y 45, filas 2-8 (y 32-144). Hoy se dibujan como una franja de 6 px centrada en el tile.
- **Muros laterales:** columnas 0 y 59, solo en las filas 10-24 (pisos 1 y 2). La terraza no tiene muros: los bordes de la sala (x = 0 y x = 960) frenan al jugador de forma invisible.
- **Huecos de escalera:** fila 17, columnas 39-47 (escalera A, piso 1 ↔ 2); fila 9, columnas 2-10 (escalera B, piso 2 ↔ 3).
- **Escalera A** (a la derecha): A1 con tope en la fila 23, cols 42-45; A2 tope fila 21, cols 46-48; A3 flotante, tope fila 19, cols 40-43; R tope fila 23, cols 49-50 (escalón para volver desde el lado de la puerta). Se sube A1 → A2 hacia la derecha, se vuelve a A3 hacia la izquierda y se sale a la losa por la col 38.
- **Escalera B** (a la izquierda, contra el muro): B1 tope fila 15, cols 4-7; B2 tope fila 13, cols 1-3; B3 flotante, tope fila 11, cols 6-9. Se sube B1 → B2 hacia la izquierda, se vuelve a B3 hacia la derecha y se sale a la terraza por la col 11.
- **Pared interior** (fondo de la casa): rectángulo en tiles x 1, y 10, 58 x 15 (px: 16, 160, 928 x 240). Cubre los pisos 1 y 2; hoy es un gris oscuro plano.

## 6. Cómo se dibuja hoy

- **No hay tileset ni tilemap de Phaser.** `RoomBuilder` recorre el layout y pone **una imagen de 16 x 16 por cada tile** con texturas generadas por código en `PreloadScene`: `tile` (`#`), `tile-step` (`E`), `tile-roof` (`T`) y `column` (`|`).
- La física es independiente del dibujo: los tiles sólidos contiguos se fusionan en rectángulos de colisión invisibles. Por eso el arte puede reemplazar las imágenes (por tiles, por un tilemap o por una imagen grande de la sala) sin tocar la colisión, siempre que respete la grilla.
- El resto (personajes, aparatos, puerta, indicador) son imágenes sueltas con *keys* de textura; al llegar el arte se cargan archivos con esas mismas keys.

**Orden de profundidad** (de atrás hacia adelante; mayor = encima):

| Depth | Qué |
|---|---|
| -100 a -97 | Fondo con parallax (cielo, nubes, ciudad lejana, casas), fijo a la cámara |
| -50 | Pared interior de la casa |
| -1 | Decoraciones del layout (columnas `\|`) |
| 0 | Tiles sólidos (`#`, `E`, `T`) |
| 10 | Entidades: NPCs, aparatos, puerta |
| 20 | Jugador |
| 30 | Indicador de interacción |
| 100 | Interfaz fija a la pantalla: caja de diálogo, avisos, HUD |
| 200 | Overlay de debug (F1) |

Consecuencias: las columnas quedan **detrás** del techo y de los tiles, y el jugador pasa **delante** de ellas. Las entidades se dibujan delante de los tiles.

**Fondo:** el parallax de la calle (`street`, versión con bruma) está anclado al suelo del piso 1 (fila 25, y = 400): con la cámara lo más abajo posible, la línea de suelo de las capas coincide con esa superficie. Afuera solo se ve en la terraza y por encima de ella. El color de fondo de la cámara es el de la última fila del cielo (`#a9ddf2`).

## 7. Métricas del salto

Medidas en el juego (`src/config/constants.js`: salto 340 px/s, gravedad 900 subiendo y 1440 cayendo, velocidad máxima 130 px/s):

| | px | tiles |
|---|---|---|
| Altura máxima (botón mantenido) | 61.4 | 3.8 |
| Altura con un toque corto | 16 | 1 |
| Distancia a velocidad máxima, en plano | 88.8 | 5.5 |
| Distancia subiendo 1 tile | 84.5 | 5.3 |
| Distancia subiendo 2 tiles | 78 | 4.9 |
| Distancia subiendo 3 tiles | 69.3 | 4.3 |

- **4 tiles no se alcanzan.** El límite es 3 tiles (13 px de margen); lo cómodo son **2 tiles** (29 px de margen).
- **Ningún escalón quedó cerca del límite de altura:** todas las subidas del nivel son de 2 tiles, y los huecos a cruzar son de 1 tile.
- **Puntos más ajustados** (por espacio para la cabeza, no por altura): para saltar de A1 a A2 hay que hacerlo desde las cols 44-45, porque sobre las cols 42-43 está A3 y deja solo 16 px para subir. Lo mismo en B: de B1 a B2 se salta desde las cols 4-5, porque B3 está encima de las cols 6-7. En la práctica se cumple solo, porque el jugador salta cerca de la pared del escalón siguiente.
- Los saltos de vuelta (A2 → A3 y B2 → B3) cruzan 2 tiles en horizontal mientras suben 2: bien dentro del margen (78 px).

## 8. Detalles que afectan al arte

- **Zonas que nadie pisa:** la losa del piso 2 a la derecha del hueco A (cols 48-58, fila 17) no es alcanzable; desde abajo es el techo del piso 1 y desde arriba se ve como piso, pero nadie camina por ahí. Lo mismo el pedacito de terraza a la izquierda del hueco B (cols 0-1, fila 9). Se pueden decorar libremente.
- **Huecos de escalera:** el jugador los atraviesa (se baja cayendo y se sube saltando). Una baranda o algo que parezca sólido sobre ellos confundiría.
- **El hueco de la terraza (fila 9, cols 2-10) queda fuera de la pared interior** (que empieza en la fila 10): hoy deja ver una franja de 1 tile del fondo de la ciudad. El arte debería cubrirla (por ejemplo, que la pared interior o el hueco de la escalera continúen ahí).
- **Columnas:** sin colisión, el jugador pasa por delante. Si se dibujan muy anchas o con base, pueden parecer obstáculos.
- **Escalones flotantes (A3, B3):** bloquean desde abajo; caminar por debajo es posible (quedan 5 tiles libres), pero saltar debajo golpea la cabeza.
- **La cámara puede mostrar toda la sala:** recorre x de 0 a 480 y y de 0 a 194, así que llega a la fila 0 (cielo) estando en la terraza y a la fila 28 estando en el piso 1. No hay zonas que nunca se vean.
- **Caja de diálogo:** ocupa los últimos 56 px de la pantalla. Con la cámara abajo del todo, el suelo del piso 1 (filas 25-28) queda casi entero detrás de la caja durante los diálogos; por eso tiene 4 filas. Ahí sirve un relleno de cimiento o tierra, sin detalles importantes.
- **Interfaz fija:** avisos del tutorial arriba al centro, contador "Desconectar: n/5" arriba a la derecha, debug arriba a la izquierda. Conviene que el arte no ponga detalles clave en esas esquinas de la vista.
- **Puerta:** está en las cols 57-58, delante de la pared del fondo y junto al muro derecho (col 59), no recortada en él. Al abrirse, el jugador camina hacia ella y el nivel termina al pasar la mitad del vano.
- **Escala del personaje:** 2 tiles de alto. Con 7 tiles de alto libre por piso, los muebles y aparatos deberían guardar esa proporción (un mueble de cocina típico ≈ 1.5-2 tiles).
