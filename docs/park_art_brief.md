# Brief de arte: nivel 3, el parque (`park`)

Fuente de verdad: `src/data/rooms/park.js` (layout y entidades) y `src/config/constants.js` (`WIND`, `SWING`, `TREE_SPARK`, `KITE_STRING`, `GRASS`). Si este documento y esos archivos difieren, mandan los archivos.

Historia: media mañana con viento. Tomás tiene la cometa enredada en la línea y quiere treparse al árbol. El jugador cruza el parque hasta el técnico de la empresa de energía, al fondo a la derecha. Hablar con él termina el nivel.

## 1. Layout

Tal como está en el archivo (17 filas de 100 caracteres, de arriba hacia abajo):

```
....................................................................................................
....................................................................................................
..............................................P..............................................P......
..............................................P..............................................P......
..............................................P..............................................P......
..............................................P..............................................P......
..............................................P..............................................P......
....................L.........................P........TT....................................P......
....................L.........................P........TT....................................P......
............W.......L.........................P........TT.........W..........................P......
............W.......L.........HHH..RRR..HH....P........TT.........W..........................P......
............W.......L........EHHH...L...HH....P........TT.........W..........................P......
............W.......L.......EEHHH...L...HH....P.....BB.TT.........W..........................P......
####################################################################################################
####################################################################################################
####################################################################################################
####################################################################################################
```

La misma grilla con número de fila a la izquierda y regla de columnas arriba (decenas en la primera línea, unidades en la segunda):

```
     0000000000111111111122222222223333333333444444444455555555556666666666777777777788888888889999999999
     0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
  0  ....................................................................................................
  1  ....................................................................................................
  2  ..............................................P..............................................P......
  3  ..............................................P..............................................P......
  4  ..............................................P..............................................P......
  5  ..............................................P..............................................P......
  6  ..............................................P..............................................P......
  7  ....................L.........................P........TT....................................P......
  8  ....................L.........................P........TT....................................P......
  9  ............W.......L.........................P........TT.........W..........................P......
 10  ............W.......L.........HHH..RRR..HH....P........TT.........W..........................P......
 11  ............W.......L........EHHH...L...HH....P........TT.........W..........................P......
 12  ............W.......L.......EEHHH...L...HH....P.....BB.TT.........W..........................P......
 13  ####################################################################################################
 14  ####################################################################################################
 15  ####################################################################################################
 16  ####################################################################################################
```

La línea eléctrica, el columpio, las zonas de pasto electrificado, los puntos de contacto del árbol, los hilos, las cometas, las mangas y los NPCs **no están en el layout**: son entidades (sección 4).

## 2. Leyenda

En esta sala la leyenda cambia respecto a la casa y la calle: `T` es el **tronco** (decorativo), no un techo sólido.

| Carácter | Qué es | Colisión |
|---|---|---|
| `#` | Suelo (pasto), 4 filas | Sólido por los cuatro lados |
| `E` | Escalón de los juegos (col 28: 1 tile de alto; col 29: 2 tiles) | Sólido |
| `H` | Torre de los juegos (torre 1: cols 30-32; torre 2: cols 40-41), 3 tiles de alto | Sólido |
| `R` | Puente de los juegos (cols 35-37, fila 10) | Sólido, también golpea la cabeza desde abajo |
| `B` | Banca (cols 52-53) | Sólido |
| `P` | Poste de la línea (cols 46 y 93) | Decorativo |
| `L` | Farol con la caja destapada (col 20, alto; col 36, bajo el puente) | Decorativo |
| `W` | Asta de la manga de viento (cols 12 y 66) | Decorativo |
| `T` | Tronco del árbol (cols 55-56, filas 7-12) | Decorativo, pero **electrocuta durante la ráfaga** |
| `.` | Vacío | Sin colisión |

## 3. Dimensiones

- Tile: 16 x 16 px. Sala: 100 x 17 tiles = **1600 x 272 px**. Superficie del suelo: fila 13, **y = 208**.
- Pantalla: 480 x 270 px. La cámara solo se mueve 2 px en vertical, así que se ve casi toda la altura de la sala.
- Jugador: hitbox de 16 x 32 px (sprites de 24 x 32). De pie en el suelo, su cabeza queda en y = 176.

## 4. Entidades

Convenciones: `x` = columna, `y` = fila de apoyo → pies en (`x · 16 + 8`, `y · 16`), origen abajo al centro. Las entidades geométricas (línea, columpio, árbol, hilos) van en px de mundo.

| Entidad | Posición | Tamaño | Notas |
|---|---|---|---|
| Spawn del jugador | tile (2, 13) → pies (40, 208) | 16 x 32 | |
| Tomás | tile (8, 13) → pies (136, 208) | sprite 24 x 32 (`npcs/tomas.png`) | |
| Técnico | tile (96, 13) → pies (1544, 208) | sprite 24 x 32 (`npcs/tecnico.png`) | Hablarle termina el nivel |
| Línea eléctrica | recta de (752, 48) a (1504, 48), 2 px | | Del borde derecho del poste de la col 46 al borde **derecho** del poste de la col 93 (lo cruza) |
| Columpio | pivote (328, 104), cadena de 84 px | asiento 24 x 4 | Travesaño del marco a y = 96 entre x 240 y 416; patas en x ≈ 240 y 416 |
| Tronco | rect x 880-912, y 112-208 | | Coincide con las columnas `T` |
| Contactos árbol-línea | CP1 (824, 48), CP2 (968, 48) | | De ahí caen las chispas |
| Hilo S1 | ancla (1160, 48), largo 152 | línea de 1 px | Cuelga de una cometa vieja rota |
| Hilo S2 | ancla (1416, 48), largo 152 | línea de 1 px | Cuelga de la cometa de Tomás (rosada) |
| Mangas de viento | amarre en la punta de cada asta `W`: (200, 146) y (1064, 146) | 14 px de largo | Se levantan con el viento |

## 5. Zonas que matan (exactas)

| Peligro | Zona | Cuándo | Causa |
|---|---|---|---|
| Pasto electrificado Z1 | x 256-400, sobre y = 208 | Siempre | `grass` |
| Pasto electrificado Z2 | x 528-688, sobre y = 208 | Siempre | `grass` |
| Tronco | rect x 880-912, y 112-208 | Solo en la ráfaga | `tree` |
| Chispas del árbol | cuadrados de 4 x 4 que caen de CP1 y CP2 | Salen en la ráfaga; las que ya salieron siguen cayendo | `spark` |
| Hilos S1 y S2 | todo el segmento ancla → punta | Siempre | `string` |

- **Pasto:** mata si el jugador está apoyado en el suelo con más de 4 px de su hitbox dentro de la zona (igual que los charcos de la calle). Por encima, saltando, no mata.
- **Tronco, chispas e hilos:** se comparan con el hitbox del jugador recortado 2 px por lado (rozar no mata).
- **Chispas, medidas:** a la altura del cuerpo de un jugador de pie pasan solo por x 784-802 (CP1) y x 926-946 (CP2). La última cae 0.8 s después de acabar la ráfaga.
- **Hilos, medidos:** a la altura del cuerpo, S1 barre x 1081-1193 y S2 x 1337-1449 en un ciclo completo (con el rebote incluido).

## 6. Mecánicas, estados y tiempos

**Viento** (sopla hacia la izquierda): calma 3.0 s → aviso 1.0 s → ráfaga 2.2 s (ciclo de 6.2 s). En la ráfaga el jugador **en el aire** recibe -100 px/s en x; en el piso no. En el aviso las mangas se levantan, cruzan rayitas de viento de derecha a izquierda y los hilos tiemblan. En la ráfaga las mangas quedan horizontales hacia la izquierda y hay más rayitas.

**Columpio:** ±40°, periodo 3.0 s (no depende del viento). El asiento es sólido solo por arriba (se atraviesa desde abajo) y arrastra al jugador que está encima. En los extremos queda a y ≈ 168 (2.5 tiles sobre el suelo), en x 262-286 (izquierda) y 370-394 (derecha). Abajo del todo queda a y = 188.

**Árbol:** en la ráfaga, cada punto de contacto suelta una chispa cada 0.12 s. Cae a 180 px/s, con una deriva de -40 px/s y ±6 px al azar al salir. Al empezar la ráfaga hay un chispazo en los dos puntos, y el tronco se tiñe y titila mientras electrocuta.

**Hilos de cometa:**
- En calma cuelgan quietos, con la punta en y = 200 (a 8 px del suelo: no se pasa por debajo).
- En el aviso tiemblan ±3°.
- En la ráfaga suben hacia la izquierda hasta -40° sin pasarse. Pasan -32.6° (la altura de la cabeza) a los 0.28 s, y arriba la punta queda en y = 164.
- Al acabar la ráfaga vuelven a 0° con un rebote a +12.4° (a los 0.53 s) y se calman: quedan dentro de 1° a los 1.7 s.

**Estados que el arte tiene que mostrar:**
- Mangas: colgando, levantándose y horizontales.
- Hilos: quietos, temblando y levantados. La cola lleva moños cada 24 px.
- Tronco y copa: normal y electrificado (titila), con un chispazo en CP1 y CP2 al inicio de la ráfaga.
- Pasto electrificado: siempre activo. Hoy es una franja amarilla de 3 px con zigzag que titila cada 120 ms.
- Faroles: con la caja destapada al pie y la tapa caída al lado.
- Cometas: la de Tomás sobre S2 y una vieja rota sobre S1.

## 7. Profundidades (con el arte integrado)

| Depth | Qué |
|---|---|
| -100 a -97 | Fondo con parallax `park` (sin bruma), fijo a la cámara |
| -1 | `park_back.png` (postes, línea, marco del columpio, faroles con caja, astas, árbol, cometas, letreros) y, encima, las mangas `windsock` |
| 0 | `park_tiles.png` (pasto, escalones, torres, puente, banca) y `tree_live` durante la ráfaga |
| 1 | Pasto electrificado: piezas de `grass_live` con el borde de arriba en y = 200 |
| 10 | Cadena del columpio (Graphics, 1 px, 0x8e8a9c) y, encima, el asiento `swing_seat`; hilos de cometa; NPCs |
| 11 | Chispas `tree_spark` y chispazo `cp_flash` |
| 20 | Jugador |
| 30 | Indicador de interacción |
| 98 | Rayitas de viento (fijas a la pantalla) |
| 100 | Interfaz: caja de diálogo y cartel de fin |
| 200 | Overlay de debug (F1) |

Cómo se usa cada pieza de arte:
- **Pasto electrificado:** una pieza de 16x10 por columna de cada zona (izquierda, medios alternando a/b, derecha). Se salta las columnas con un sólido apoyado en el suelo (la torre 2, cols 40-41, en Z2), pero conserva las puntas de los extremos de la zona. Los frames A (0-3) y B (4-7) se alternan cada 120 ms.
- **Asiento:** `swing_seat` (24x6) con su esquina en la misma posición que la zona física; su fila de arriba (opaca en los 24 px) es la cara sólida.
- **Mangas:** `windsock` (24x24) con el pixel (21, 2) en el amarre, (200, 146) y (1064, 146): 4 px debajo de la punta de cada asta de `park_back` (y = 142). Frames: calma 0-1, aviso 2-3, ráfaga 4-5, alternados cada 250 ms.
- **Árbol en la ráfaga:** `tree_live` (240x168 por frame, anim "buzz") con la esquina en (776, 40). Si el frame cargado no mide 240x168, el juego avisa por consola y usa el tinte greybox del tronco.
- **Chispas:** `tree_spark` (6x6, anim "fall") centrado en el centro de la hitbox de 4x4. **Chispazo:** `cp_flash` (17x17, anim "flash" una vez) centrado en CP1 y CP2 al empezar cada ráfaga.
- **Hilos:** siguen dibujados por código: línea de 1 px 0xf4f1ea y moños de 5 px perpendiculares al hilo cada 24 px desde los 12 px del ancla, alternando 0xe05a45, 0xf2c94c y 0x4f8fbf. Las cometas vienen en `park_back.png`, en las anclas.
- **Tomás:** "worry" hasta que el jugador le habla por primera vez; después "idle" y "talk". **Técnico:** "radio" hasta que el jugador entra a su zona; después "idle" (mirándolo) y "talk".

## 8. Ruta y márgenes medidos con un bot

1. **Columpio** (en calma): se sube al asiento desde x < 256 cerca del extremo izquierdo, con una ventana de **0.75 s** (de 0.55 s antes a 0.20 s después del extremo). Se baja cerca del extremo derecho con una ventana de **1.0 s** (de 0.75 s antes a 0.25 s después): cae con el borde izquierdo entre x 407 y 454, y hace falta ≥ 396.
2. **Torres** (en calma):
   - Torre 1 → puente se alcanza despegando desde cualquier punto de los últimos 32 px de la torre, más 4-8 px de coyote time.
   - Puente → torre 2 igual. Saltando tarde se pasa por encima de la torre 2 y se cae vivo pasando Z2.
   - Bajando caminando de la torre 2 se cae con el borde izquierdo en x 712 (hace falta ≥ 684).
   - En ráfaga los huecos fallan, salvo saltando en el último pixel con coyote time (ventana de unos 6 px, 0.05 s).
3. **Árbol:** se espera la ráfaga en la banca (x 832-880). Ahí las chispas pasan a 30 px por la izquierda y el tronco está a 2 px por la derecha del borde 880. Se cruza a la zona de S1 arrancando entre **0.4 s y 3.4 s** después de que termina la ráfaga (ventana de 3.0 s).
4. **S1:** se espera con el borde derecho en x < 1081 (zona 984-1070). Se cruza arrancando entre **0.1 s y 1.5 s** después de empezar la ráfaga (ventana de 1.4 s) hasta la zona de S2.
5. **S2:** se espera en x 1200-1334 (el rebote de S1 llega a 1193 y el barrido de S2 empieza en 1337). Se cruza arrancando entre **0.2 s y 1.6 s** después de empezar la ráfaga (ventana de 1.4 s) hasta x > 1460. Después, el técnico.

## 9. Detalles que afectan al arte

- **La copa del árbol toca la línea en CP1 y CP2:** es la explicación visual de las chispas, así que conviene que las ramas lleguen a esos dos puntos.
- **El pasto electrificado son zonas exactas:** un dibujo más ancho que x 256-400 y 528-688 engañaría.
- **El asiento del columpio se atraviesa desde abajo:** no dibujarlo como una caja gruesa.
- **El puente bloquea desde abajo:** debajo quedan 2 tiles libres (y además es Z2).
- **La punta de los hilos queda a 8 px del suelo en calma:** tiene que leerse que no se puede pasar por debajo.
- **Caja de diálogo:** ocupa los últimos 56 px de la pantalla; con la cámara abajo tapa casi todo el suelo (filas 13-16).
