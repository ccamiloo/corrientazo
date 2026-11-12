# Brief de arte: nivel 5, la obra (`construction`)

Fuente de verdad: `src/data/rooms/construction.js` (layout y entidades) y `src/config/constants.js` (`POWER_LINE`, `MIXER`, `SCAFFOLD_ARC`, `CRANE`, `BEAM_WAVE`, `CHECKPOINT`). Si este documento y esos archivos difieren, mandan los archivos.

Historia: el atajo hacia el restaurante de la Seño pasa por una obra en construcción montada demasiado cerca de una línea de alta tensión. La grúa quedó trabada casi pegada a los cables. El jugador cruza la obra hasta la ingeniera residente, que hace parar todo y le muestra el camino al restaurante. Tip central: con alta tensión no hace falta tocar; si te acercas mucho, la corriente salta en forma de arco.

Es el último nivel jugable y el más difícil: ventanas cortas, pero todo avisa antes.

## 1. Layout

17 filas de 120 caracteres, con número de fila a la izquierda y regla de columnas arriba (centenas, decenas y unidades):

```
     000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000011111111111111111111
     000000000011111111112222222222333333333344444444445555555555666666666677777777778888888888999999999900000000001111111111
     012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
  0  .P....................................................................................................................P.
  1  .P....................................................................................................................P.
  2  .P....................................................................................................................P.
  3  .P....................................................................................................................P.
  4  .P....................................................................................................................P.
  5  .P....................................................................................................................P.
  6  .P....................................................................................................................P.
  7  .P........................................................c...........c...............W....WW....W....W...............P.
  8  .P............................TTTTTTTTTTTTTTTTT.EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEVVVVVVVVVVVVVVVVVVVVVVVVEEEEEEEEEEEEEEE
  9  .P..............................................EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
 10  .P..............................................EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
 11  .P................SSS.........TTTTTTTTTTTTTTTTT.EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
 12  .P................SSS...........................EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE
 13  ########################################################################################################################
 14  ########################################################################################################################
 15  ########################################################################################################################
 16  ########################################################################################################################
```

La línea de alta tensión, el concreto fresco, la mezcladora, la grúa, los arcos, la onda de la viga, los cascos y los NPCs **no están en el layout**: son entidades (secciones 4 y 5).

## 2. Leyenda

| Carácter | Qué es | Colisión |
|---|---|---|
| `#` | Suelo de obra, 4 filas | Sólido |
| `S` | Sacos de cemento, cols 18-20, filas 11-12 (cara de arriba en y = 176) | Sólido |
| `T` | Tablón del andamio: abajo fila 11 (y = 176), arriba fila 8 (y = 128), cols 30-46 (x 480-752) | **Solo por arriba** (se atraviesa desde abajo y por los lados), sin rebote |
| `E` | Concreto: la losa (cols 48-80, fila 8) y el edificio, de la col 48 a la 119, filas 8-12 (cara de arriba en y = 128) | Sólido |
| `c` | Mocho de columna con varillas, cols 58 y 70, fila 7 (cara de arriba en y = 112) | Sólido |
| `V` | Viga de acero, cols 81-104, fila 8 (x 1296-1680, cara de arriba en y = 128) | Sólido; su cara de arriba la recorre la onda |
| `W` | Tablón de madera sobre la viga, cols 86, 91-92, 97 y 102, fila 7 (cara de arriba en y = 112) | Sólido, siempre seguro |
| `P` | Poste de la línea, col 1 (filas 0-12) y col 118 (filas 0-7) | Decorativo |
| `.` | Vacío | Sin colisión |

## 3. Dimensiones

- Tile: 16 x 16 px. Sala: 120 x 17 tiles = **1920 x 272 px**. Suelo: fila 13, **y = 208**. Losa, viga y edificio: **y = 128**.
- Pantalla: 480 x 270 px; la cámara solo se mueve 2 px en vertical.
- Jugador: hitbox de 16 x 32 px (sprites de 24 x 32). De pie en el suelo, la cabeza queda en y = 176; en la losa, en y = 96; en un tablón `W` o un mocho, en y = 80.
- Salto: 61.4 px de alto y 88.8 px de largo en plano (medido con el bot).

## 4. Entidades

Convenciones: `x` = columna, `y` = fila de apoyo → pies en (`x · 16 + 8`, `y · 16`), origen abajo al centro. Lo geométrico va en px de mundo.

| Entidad | Posición | Tamaño placeholder | Notas |
|---|---|---|---|
| Spawn del jugador | tile (2, 13) → pies (40, 208) | 16 x 32 | |
| Maestro de obra | tile (6, 13) → pies (104, 208) | 16 x 28 | Placeholder azul con casco |
| Ingeniera residente | tile (112, 8) → pies (1800, 128) | 16 x 28 | Placeholder coral con casco, encima del edificio |
| Línea de alta tensión | segmento (0, 12)-(1920, 12), 2 px | | Roja oscura; aisladores en la punta de los postes (x 24 y 1896) |
| Mezcladora | cols 26-27 sobre el suelo (x 416-448); tambor de radio 10 centrado en (432, 192) | | Decorativa; su cable roto va de (424, 196) a la punta pelada en (392, 207), dentro de C2 |
| Concreto fresco C1 | x 208-288, sobre y = 208 | 3 px de alto | Entre el inicio y los sacos |
| Concreto fresco C2 | x 336-416, sobre y = 208 | 3 px de alto | Entre los sacos y la mezcladora |
| Andamio | tramos del tablón de arriba: S1 x 480-544, S2 544-608, S3 608-672, S4 672-752 | | Parales grises (2 px) en x 480, 544, 608, 672 y 750, de y 128 al suelo |
| Pluma de la grúa | de x 800 a 1260, centrada en y = 26 (celosía de 6 px de alto) | | Decorativa |
| Torre de la grúa | x 1024-1040, de y 26 a 128 | | Decorativa |
| Carro | va y viene entre x 880 y 1200 (centro), colgado de la pluma; el gancho sale de y = 30 | 12 x 6 | Empieza en 880 hacia la derecha |
| Carga de varillas | 40 x 8 centrada en el carro; borde de arriba entre y 50 (arriba) e y 114 (abajo) | 40 x 8 | Manojo café con chispitas; cable negro del gancho a la carga |
| Cascos | CP1 tile (50, 8) → pies (808, 128); CP2 tile (80, 8) → pies (1288, 128) | 12 x 7 | Casco amarillo colgado de un gancho a la altura de la cabeza (y 95-102) |

## 5. Zonas que matan (exactas)

| Peligro | Zona | Cuándo | Causa |
|---|---|---|---|
| Línea de alta tensión | segmento (0, 12)-(1920, 12) | Siempre | `line` |
| Concreto C1 | x 208-288, apoyado en y = 208 | Mezcladora girando | `concrete` |
| Concreto C2 | x 336-416, apoyado en y = 208 | Mezcladora girando | `concrete` |
| Arco del andamio | rect x del tramo de turno (S1-S4), y de 12 a 128 | Fase `arc` del paso | `arc` |
| Carga de la grúa | rect de 40 x 8 en el carro | Siempre | `crane` |
| Cable del gancho | segmento vertical (x del carro, 30) - (x del carro, borde de arriba de la carga) | Siempre | `crane` |
| Onda de la viga | franja de 48 px sobre la cara de arriba de la viga, recortada a x 1296-1680 | Fase `travel`, solo apoyado en la viga (pies en y = 128) | `beam` |

- **Línea, carga y cable:** se comparan con el hitbox recortado por lado (línea 1 px, carga 2 px, cable 1.5 px): rozar no mata.
- **Concreto:** mata si el jugador está apoyado con **más de 8 px** de su hitbox encima, es decir, con el centro sobre el concreto (los charcos usan 4; ver sección 8).
- **Arco:** cualquier solapamiento del hitbox con el rect. Quedarse en el tablón de abajo (cabeza en y = 144) o en el suelo debajo del andamio es seguro, pero **saltar desde el suelo debajo del andamio mete la cabeza hasta y = 115**, dentro del rect del arco.
- **Onda:** mata si el jugador está apoyado en la viga y su hitbox se mete más de 2 px en la franja. En el aire o encima de un tablón `W` está a salvo.

## 6. Mecánicas, estados y tiempos

Cada mecánica tiene su propio reloj (`src/systems/PhaseClock.js`), que arranca al armar la sala y avanza con el juego.

**Mezcladora** (reloj del concreto): apagada 2.0 s → aviso 0.45 s → girando 1.4 s (ciclo de 3.85 s).
- Mezcladora: quieta; en el aviso tiembla 1 px de lado a lado; girando, el tambor da vueltas (1.5 por segundo) y la punta pelada del cable chispea dentro de C2.
- Concreto: gris mojado; en el aviso titila con puntos amarillos; girando, amarillo con zigzag (como los charcos vivos).

**Arcos del andamio:** secuencia de ida y vuelta S1 S2 S3 S4 S3 S2 S1 S2... con un paso de 0.55 s (ciclo completo de 3.3 s). En cada paso, el tramo de turno avisa 0.35 s (el borde del tablón titila en celeste y la línea encima chisporrotea) y después le cae el arco 0.20 s (zigzag blanco con halo celeste de la línea al tablón y el tramo iluminado). El tablón de abajo es seguro y desde ahí se ve venir la secuencia.

**Grúa:** el carro va y viene entre x 880 y 1200 a 55 px/s (ida y vuelta en 11.6 s). La carga tiene su propio ciclo: arriba 1.4 s (borde de arriba en y = 50) → bajando 0.5 s → abajo 0.9 s (y = 114) → subiendo 0.5 s (ciclo de 3.3 s, lineal). Arriba se camina por debajo (la cabeza queda en y = 96, con 38 px de aire), pero un salto completo pega con la carga. Abajo tapa el paso. Cada 1.2-3.0 s (azar con semilla), una chispa de 160 ms salta entre la pluma y la línea (decorativa).

**Onda de la viga:** aviso 0.4 s (chispas en el extremo derecho, x 1680) → viaje 2.56 s → pausa 0.6 s (ciclo de 3.56 s). En el viaje, el **centro** de la franja de 48 px va de x 1680 a 1296 a 150 px/s, hacia la izquierda, y la franja se recorta a la viga. Así cada punto de la viga, también los extremos, queda cubierto al menos media franja. La franja es amarilla, de 4 px, con un zigzag que corre.

**Cascos:** al tocar el área del casco (su tile ± 4 px, de y 84 a 128) se guarda como punto de reaparición. Solo cuentan hacia adelante: tocar CP1 después de CP2 no retrocede. Al tomarlo titila 0.6 s y queda iluminado con un marco claro. Persisten al morir (se reinician con una partida nueva). Al morir se reaparece en el último casco tomado, con la cámara ya ahí.

**Estados para el arte:**
- Línea y aisladores: fijos.
- Mezcladora: quieta, temblando y girando; cable roto con la punta pelada (chispas al girar).
- Concreto fresco: mojado, aviso y electrificado.
- Tablón de arriba: normal, tramo en aviso (brillo en el borde) y tramo con arco.
- Arco: rayo en zigzag de la línea al tablón (varios frames para que no se vea igual dos veces seguidas); chispas en la línea en el aviso.
- Grúa: pluma y torre (fijas), carro, cable del gancho, carga de varillas (con chispitas), chispa entre la pluma y la línea.
- Viga: normal, chispas en el extremo derecho (aviso) y franja de la onda.
- Casco: sin tomar, tomándolo (destello) y tomado (iluminado).
- Maestro de obra e ingeniera: `idle` y `talk` (los dos miran al jugador al acercarse).

## 7. Profundidades

Greybox (sin arte; cada pieza vuelve a esto si su textura no carga):

| Depth | Qué |
|---|---|
| -100 a -97 | Fondo con parallax `construction`, fijo a la cámara |
| -2 | Parales del andamio, pluma y torre de la grúa |
| -1 | Postes (`P`), tablones del andamio (`T`, decorativos para RoomBuilder) y franja de la onda (debajo de los tablones `W`, que la tapan al pasar) |
| 0 | Tiles sólidos |
| 1 | Concreto fresco (encima del suelo) |
| 10 | Línea y aisladores, mezcladora, arcos, carro, cable y carga, chispa de la pluma, cascos y NPCs |
| 20 | Jugador |
| 30 | Indicador de interacción |
| 100 | Interfaz: caja de diálogo y cartel de fin |
| 200 | Overlay de debug (F1) |

Con el arte integrado (`public/assets/props/construction/README.txt`):

| Depth | Qué |
|---|---|
| -100 a -97 | Fondo con parallax `construction` |
| -50 | `construction_back.png` en (0, 0): postes, aisladores, la línea, parales y crucetas del andamio, pluma, torre, mezcladora quieta, letreros y la escalera |
| -1 | Onda de la viga (3 piezas `beam_wave` desde centro - 24 en y = 120, recortadas a x 1296-1680; los tablones W la tapan) |
| 0 | `construction_tiles.png` en (0, 0): suelo, sacos, tablones, losa, edificio, mochos, viga y bloques W |
| 1 | Concreto (piezas `concrete` de 16x6 con esquina en y = 202) |
| 10 | Mezcladora (`mixer`, esquina (388, 168)), `plank_fx` (y = 127), `line_spark`, `arc` (centrado, esquina y = 11), cable del gancho (1 px, `0x1e1822`), carga (`load`, esquina (x - 22, borde de arriba - 2)), `boom_spark` (esquina (1026, 10)), chispas `spark`, cascos (`casco`, origen abajo al centro) y NPCs |
| 11 | Carro (`trolley`, esquina (x - 8, 26), encima del cable) y la chispa de la punta pelada de la mezcladora |

Medido contra la colisión (alfa de `construction_tiles.png` columna por columna): tablones de arriba y de abajo, losa, viga y bloques W coinciden al pixel. Diferencias solo visuales de 1-2 px: piedritas del suelo en y = 207, esquinas redondeadas de los sacos, las abrazaderas de los extremos del andamio (x 478-479 y 752-753) y los mochos 1 px más angostos por lado. La parte opaca de `load` coincide con el rect letal (0.2 px por el redondeo).

## 8. Ruta y márgenes medidos con un bot

El bot maneja las teclas frame a frame (60 fps) con cada reloj puesto en el instante que se quiere probar. Tiempos "del ciclo" = segundos desde que empieza el apagado (mezcladora), el aviso de S1 (arcos), el arranque del carro (grúa) o el aviso (onda).

1. **Línea.** El punto más alto que alcanza la cabeza (salto completo desde un tablón `W` o un mocho, cara en y = 112) es **y = 18.6**. La línea mata con y ≤ 11: sobran **7.6 px**. Ningún salto la alcanza.
2. **Concreto C1.**
   - Saltando desde el borde con el concreto vivo: los sacos están 32 px más arriba, así que el salto rinde ~76 px (no 88). Hay que despegar con el borde derecho del hitbox entre **x 210 y 216** (**≈ 5.8 px, 2.7 frames, 45 ms**). Se aterriza con 1-4 px sobre los sacos. **Ajustado** (ver el cambio de constante abajo).
   - Caminando y subiendo a los sacos desde dentro: funciona arrancando en los primeros 1.7 s del apagado o en los últimos 0.15 s del giro (ventana de **~1.85 s** de 3.85).
3. **Concreto C2.**
   - Saltando desde los sacos con el concreto vivo: sirve despegar con el borde izquierdo entre **x 312 y 335** (~23 px). Se cae en x 410-437.
   - Bajando de los sacos y caminando: ventana de **~2.0 s** de 3.85.
4. **Andamio.**
   - Por arriba, siguiendo al arco: parado en el tablón de abajo bajo S1, el salto vertical funciona entre 0.9 y 1.55 s del ciclo (**~0.65 s** de 3.3). Con un poco de flecha derecha en el salto, la ventana se corre (1.15-1.8 s o 1.3-2.0 s) pero mide lo mismo. Las reglas en el tablón de arriba son tres:
     - no entrar a un tramo que brille;
     - esperar pegado a su borde;
     - si el tramo propio empieza a brillar, saltar hacia el tramo por donde acaba de pasar el rayo.

     El momento justo es cuando el arco rebota en S4: S3 solo queda seguro 0.9 s entre sus dos arcos, y hay que meterse a S4 en los 0.35 s entre el arco de S4 y el de S3. Subir tarde (por ejemplo, en vertical apenas S1 termina) no deja tiempo.
   - Por abajo, asomándose en S4: parado al final del tablón de abajo (x 728-752), el salto a la losa funciona en **~2.8 s de cada 3.3**. Solo falla cuando S4 está por caer. Es la ruta fácil.
5. **Grúa.**
   - Leyendo la carga (avanzar si al correr no se cruza con la carga baja; si no, quedarse quieto o retroceder): cruza en el **100 % de las fases** del carro (59 de 59), en 3.4 a 5.6 s desde CP1.
   - Corriendo a ciegas sin parar: solo funciona en el 34 % de los arranques.
   - Los mochos se pasan con un saltito: mantener el salto 2 a 7 frames (≈ 30-115 ms) sube 24 a 40 px. Pasa el mocho de 16 px y no llega a la carga levantada (mata si se sube más de 40 px). Un toque de 1 frame sube 16.1 px (justo). Un salto completo bajo la carga levantada mata.
6. **Viga.**
   - Desde la losa junto a CP2: arrancar funciona entre 0 y 1.6 s y entre 2.9 y 3.55 s del ciclo de la onda (**~2.25 s** de 3.56). La franja solo pasa por el primer tramo de viga (cols 81-85) en los últimos 0.7 s del viaje.
   - Entre tablones `W`: desde parado y con la flecha derecha sostenida, cualquier punto de despegue sirve en los cuatro saltos. La excepción es W91-92: hay que despegar desde su parte derecha (borde izquierdo en x ≥ 1455). Soltar la flecha da igual (sirve desde 40 px antes hasta 24-32 px después del tablón).

**Constante ajustada por el bot:** `MIXER.edgeMarginPx` pasó de 4 (el de los charcos) a **8**. Con 4, el concreto vivo mataba desde que el borde derecho pasaba x 212 y el salto a los sacos exigía despegar desde x ≥ 210: una ventana de 2 px, menos de un frame a velocidad máxima. Con 8 queda de 210 a 216.

## 9. Detalles que afectan al arte

- **El fondo `construction` ya trae una grúa amarilla y un esqueleto de edificio.** Detrás de la grúa de juego (pluma de x 800 a 1260 a y = 26, torre en x 1024-1040) se confunden. Conviene que la grúa del fondo no quede detrás de la de juego, o que la de juego tenga un color o un contraste claramente distinto.
- **La escalera de la ingeniera** ("por esa escalera sales derechito al restaurante") no está en el layout. Va en el arte de fondo, cerca de la col 112-118.
- **Los tablones del andamio se atraviesan desde abajo:** que se lean como tablas sobre un andamio abierto, no como piso macizo.
- **Los tramos S1-S4 tienen que distinguirse** (pintura, abrazaderas o uniones del andamio en x 544, 608 y 672). La secuencia del arco es la mecánica del tramo y el jugador la lee desde abajo.
- **Madera `W` y acero `V`:** tienen que distinguirse muy bien a simple vista; es la regla de la viga.
- **Los cascos van a la altura de la cabeza** (y 95-102), colgados de un gancho: el jugador los toma caminando.
- **La línea pasa a 12 px del borde de arriba** y la cámara llega hasta y = 0 o 2: la línea se ve siempre arriba de la pantalla.
- **Caja de diálogo:** ocupa los últimos 56 px de la pantalla. Sobre la losa (pies en y = 128) el jugador queda muy por encima.
