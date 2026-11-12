# Brief de arte: nivel 4, el mercado (`market`)

Fuente de verdad: `src/data/rooms/market.js` (layout y entidades) y `src/config/constants.js` (`MARKET_POWER`, `HOOKUP`, `AWNING`, `CART`, `PULPO`). Si este documento y esos archivos difieren, mandan los archivos.

Historia: mediodía. Para los corrientazos falta el jugo, pero el puesto de doña Carmen no puede licuar: con el aguacero se dañaron los enganches (conexiones ilegales) del mercado y su multitoma (el "pulpo") está sobrecargada y botando chispas. El jugador cruza el mercado, sube por las cajas y baja el taco del puesto. Doña Carmen desconecta todo y le da los jugos.

## 1. Layout

Tal como está en el archivo (17 filas de 110 caracteres, de arriba hacia abajo). La col 92 lleva cajas en las filas 9-12 (antes era un hueco que atrapaba al jugador):

```
..............................................................................................................
..............................................................................................................
..........P...................................................................................................
..........P...................................................................................................
..........P...................................................................................................
..........P...................................................................................................
..........P...................................................................................................
..........P......................FFFFFF......................................................KK...............
..........P......................FFFFFF......................................................KK...............
..........P......AAAAA...........FFFFFF...................................................KKKKK...............
..........P..................AAA.FFFFFF...................................................KKKKK...............
..........P..KK..................FFFFFF...MMMmmmMMmmmmMMmmmMMM...........................KKKKKK...............
..........P..KK..................FFFFFF...MMMmmmMMmmmmMMmmmMMM..........................KKKKKKK...............
##############################################################################################################
##############################################################################################################
##############################################################################################################
##############################################################################################################
```

La misma grilla con número de fila a la izquierda y regla de columnas arriba (centenas, decenas y unidades):

```
     00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001111111111
     00000000001111111111222222222233333333334444444444555555555566666666667777777777888888888899999999990000000000
     01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
  0  ..............................................................................................................
  1  ..............................................................................................................
  2  ..........P...................................................................................................
  3  ..........P...................................................................................................
  4  ..........P...................................................................................................
  5  ..........P...................................................................................................
  6  ..........P...................................................................................................
  7  ..........P......................FFFFFF......................................................KK...............
  8  ..........P......................FFFFFF......................................................KK...............
  9  ..........P......AAAAA...........FFFFFF...................................................KKKKK...............
 10  ..........P..................AAA.FFFFFF...................................................KKKKK...............
 11  ..........P..KK..................FFFFFF...MMMmmmMMmmmmMMmmmMMM...........................KKKKKK...............
 12  ..........P..KK..................FFFFFF...MMMmmmMMmmmmMMmmmMMM..........................KKKKKKK...............
 13  ##############################################################################################################
 14  ##############################################################################################################
 15  ##############################################################################################################
 16  ##############################################################################################################
```

El congelador, los charcos, los enganches, la carretilla, el pulpo, el taco y los NPCs **no están en el layout**: son entidades (sección 4).

## 2. Leyenda

| Carácter | Qué es | Colisión |
|---|---|---|
| `#` | Piso de baldosa, 4 filas | Sólido |
| `K` | Cajas (cols 13-14: 2 de alto; col 88: 1; col 89: 2; cols 90-92: 4; cols 93-94: 6) | Sólido |
| `A` | Toldo de lona (toldo 1: cols 17-21, fila 9; toldo 2: cols 29-31, fila 10) | **Solo por arriba** (se atraviesa desde abajo y por los lados) y **rebota** |
| `F` | Puesto de frutas, cols 33-38, filas 7-12 (techo en y = 112) | Sólido |
| `M` | Mostrador, tramo de madera (cols 42-44, 48-49, 54-55, 59-61) | Sólido, siempre seguro |
| `m` | Mostrador, tramo de lata (cols 45-47, 50-53, 56-58) | Sólido; **electrocuta** a quien esté parado encima con el congelador prendido |
| `P` | Poste de los enganches (col 10) | Decorativo |
| `.` | Vacío | Sin colisión |

## 3. Dimensiones

- Tile: 16 x 16 px. Sala: 110 x 17 tiles = **1760 x 272 px**. Superficie del piso: fila 13, **y = 208**.
- Pantalla: 480 x 270 px; la cámara solo se mueve 2 px en vertical.
- Jugador: hitbox de 16 x 32 px (sprites de 24 x 32). De pie en el piso, la cabeza queda en y = 176; sobre el mostrador, en y = 144.

## 4. Entidades

Convenciones: `x` = columna, `y` = fila de apoyo → pies en (`x · 16 + 8`, `y · 16`), origen abajo al centro. Lo geométrico va en px de mundo.

| Entidad | Posición | Tamaño placeholder | Notas |
|---|---|---|---|
| Spawn del jugador | tile (2, 13) → pies (40, 208) | 16 x 32 | |
| Vendedor | tile (6, 13) → pies (104, 208) | 16 x 28 | Placeholder verde |
| Doña Carmen | tile (103, 13) → pies (1656, 208) | 16 x 28 | Placeholder rosado |
| Congelador del pescado | tiles x 11-12, filas 10-12 (x 176-208, y 160-208) | | Decorativo; luz en (192, 166) |
| Manojo de enganches | 3 cables desde la punta del poste (168, 40) hasta x 1760, con comba entre y 34 y 48 | | Decorativo; de él cuelgan H1-H4 |
| Extensión con empalme | por el piso de x 210 a 420 (y = 207), cinta en x 318 | | Decorativa, cruza W1 |
| Carretilla | caja de 32 x 16 sobre el piso (y 192-208); su borde izquierdo va de x 1056 a 1360 | 32 x 16 | Caja café con dos ruedas |
| Pulpo | pies en (1600, 208) | 28 x 8 | Multitoma roja con 5 enchufes y cables |
| Taco | rect x 1504-1520, y 72-92 | 16 x 20 | Se alcanza parado en las cajas de las cols 93-94 (pies en y = 112) |

## 5. Zonas que matan (exactas)

| Peligro | Zona | Cuándo | Causa |
|---|---|---|---|
| Charco W1 | x 240-400, sobre y = 208 | Congelador prendido | `puddle` |
| Charco W2a | x 624-672, sobre y = 208 | Congelador prendido | `puddle` |
| Charco W2b | x 992-1040, sobre y = 208 | Congelador prendido | `puddle` |
| Enganche H1 | segmento (280, 72) - (344, 80) | Congelador prendido | `hookup` |
| Enganche H2 | segmento (584, 44) - (598, 110) | Congelador prendido | `hookup` |
| Enganche H3a | segmento (712, 130) - (776, 130) | Congelador prendido | `hookup` |
| Enganche H3b | segmento (792, 130) - (872, 130) | Congelador prendido | `hookup` |
| Enganche H3c | segmento (888, 130) - (952, 130) | Congelador prendido | `hookup` |
| Enganche H4 | segmento (1196, 40) - (1204, 200) | Congelador prendido | `hookup` |
| Lata del mostrador | cara de arriba de los tramos `m` (y = 176): x 720-768, 800-864 y 896-944 | Congelador prendido | `metal` |
| Chispas del pulpo | cuadrados de 4 x 4 | Siempre (salen en la ráfaga) | `pulpo` |

- **Charcos y lata:** matan si el jugador está apoyado con más de 4 px de su hitbox encima (igual que los charcos de la calle).
- **Enganches y chispas:** se comparan con el hitbox recortado 2 px por lado (rozar no mata).
- **Chispas del pulpo, medidas:** con las constantes finales, el 8 % de las chispas llega a la cima de la columna de 6 cajas y casi ninguna pasa de x 1312 hacia la izquierda.

## 6. Mecánicas, estados y tiempos

**Congelador** (reloj del mercado): apagado 2.6 s → aviso 0.8 s → prendido 1.8 s (ciclo de 5.2 s). Lo eléctrico sigue este reloj, salvo el pulpo.
- Luz del congelador: apagada; roja titilando cada 100 ms en el aviso; roja fija y ondas de zumbido en el prendido.
- Charcos: azules; en el aviso titilan; en el prendido, amarillos.
- Enganches: grises; amarillos titilando en el aviso; amarillos con chispitas en el prendido.
- Lata: gris; en el prendido, borde amarillo que titila.

**Toldos:** sólidos solo por arriba. Al caer encima, el jugador rebota solo con vy = -430 px/s (sube unos 100 px, 6.4 tiles) y no se puede quedar parado. Durante el rebote se ve la animación de salto. La lona se hunde 2 px durante 120 ms en cada rebote.

**Carretilla:** va y viene a 70 px/s; empieza en x 1056 hacia la derecha. Su cara de arriba es sólida y lleva al que está encima. Si choca de lado con el jugador, lo empuja durante 0.25 s con su velocidad más 40 px/s (no mata). Si lo aprieta contra un sólido, se detiene en vez de atravesarlo.

**El pulpo** (ciclo propio): pausa 2.4 s → aviso 0.6 s (se pone rojo y echa humo) → ráfaga 0.9 s (ciclo de 3.9 s). En la ráfaga suelta una chispa cada 0.08 s desde (1600, 200), hacia arriba a la izquierda (100°-165°), a 200-440 px/s, con gravedad de 600 px/s². Las chispas desaparecen al tocar un sólido o el piso. Con el taco abajo se apaga del todo y suelta un humito que se va en 1.5 s.

**Estados para el arte:**
- Congelador: luz apagada, roja titilando y roja fija con ondas.
- Charcos: apagado, aviso y electrificado.
- Enganches: apagado, aviso y prendido con chispas.
- Lata: normal y electrificada.
- Toldos: normal y hundido (rebote).
- Carretilla: cajón y ruedas (más adelante, quizás un cotero empujándola).
- Pulpo: en pausa, en aviso (rojo con humo), en ráfaga y apagado (con el humito).
- Taco: arriba (prendido) y abajo (apagado).

## 7. Profundidades

Finales, con el arte integrado (entre paréntesis, lo que cambia si una textura no carga y queda el greybox):

| Depth | Qué |
|---|---|
| -100 a -97 | Fondo con parallax `market`, fijo a la cámara |
| -50 | `market_back.png` en (0, 0): puestos, poste, manojo, partes con forro de los enganches, congelador, extensión, palos de los toldos, columna del taco, mostrador de doña Carmen |
| -1 | Luz del congelador (`freezer_light`, centro en (192, 166)) y sus ondas (`freezer_waves`, esquina en (172, 134), solo prendido). (Greybox: poste, manojo, bajadas, extensión y congelador dibujados con Graphics.) |
| 0 | `market_tiles.png` en (0, 0): piso, cajas, puesto de frutas, mostrador. (Greybox: un tile por celda.) |
| 1 | Charcos (piezas `puddle` de 16x7 desde y = 207, como en la calle: debajo de los tiles los taparía el piso) y `metal_live` (anim `buzz`) sobre cada tile `m` de las dos filas del mostrador, solo prendido |
| 10 | Enganches H1-H4 (Graphics de 2 px) con sus `hookup_spark`, toldos (piezas `awning` de 16x12), carretilla (`cart`), pulpo (`pulpo`, origen abajo al centro en (1600, 208)), taco (`breaker`, rect en (1504, 72)) y NPCs |
| 11 | Chispas del pulpo (`pulpo_spark`, centradas en la hitbox de 4x4) |
| 20 | Jugador |
| 30 | Indicador de interacción |
| 100 | Interfaz: caja de diálogo y cartel de fin |
| 200 | Overlay de debug (F1) |

Estados del arte en el juego:
- Enganches: cobre pelado `0xb87333` apagado; en el aviso alternan cobre y `0xffe14a` cada `HOOKUP.blinkMs`; prendido `0xffe14a` con 2 chispas (3 si el tramo mide 70 px o más) fijas en los centros de tramos iguales.
- Charcos: `off`; aviso alternando `warn` / `off`; prendido alternando `live_a` / `live_b`.
- Toldos: toldo 1 frames 0-3, toldo 2 frames 4-7 (izquierda, medios alternando a/b, derecha); bajan 2 px durante `AWNING.sagMs` al rebotar.
- Carretilla: `roll` mientras se mueve (pausada si la frena el jugador), `flipX` yendo a la izquierda.
- Pulpo: `idle` en la pausa, `warn`, `burst`; al bajar el taco `smoke`, que termina en el frame 5 (apagado). Al rearmar la sala con el taco abajo, frame 5 directo.
- Taco: frame 0 prendido, 1 apagado.
- Vendedor: `point` mientras el jugador está en su zona y no le ha hablado; si no, `idle`; `talk` al escribir.
- Doña Carmen: `alarm` mientras el taco esté prendido (cerca o lejos); con el taco abajo, `idle`; `talk` al escribir.

## 8. Ruta y márgenes medidos con un bot

Tiempos "del congelador" = segundos desde que empieza el apagado; tiempos "del pulpo" = desde que empieza su pausa.

1. **Pescado.**
   - Caminando por W1 desde las cajas: funciona arrancando en los primeros 2.0 s del apagado (o en los últimos 0.4 s del prendido). Ventana de unos 2.4 s.
   - Por el toldo 1 (cajas → toldo → rebote): funciona arrancando en el apagado o el aviso (hasta 2.6 s) y en los últimos 0.4 s del prendido. Ventana de unos 3.0 s. En el prendido el rebote pega con H1.
2. **Frutas.** Desde el piso bajo el toldo 2, un salto recto atraviesa la lona, el rebote sube y se cae en el techo de las frutas entre x 536 y 581, según cuándo se suelte la flecha. Pasar H2 y bajar al mostrador funciona arrancando en los primeros 1.6 s del apagado.
3. **Carnes.** De madera en madera, cada tramo tiene una ventana de 2.8-3.0 s. El mostrador entero de una, 1.8 s. Parado en la madera, la cabeza queda 14 px debajo de H3: se aguanta el prendido sin problema.
4. **Carretilla y H4** (desde la madera D, bajando por encima de W2b): la ventana va de 0.8 s a 1.5 s según dónde esté la carretilla. Esperar en el piso justo después de W2b es peligroso: si la carretilla empuja hacia la izquierda con el congelador prendido, el jugador cae en W2b.
5. **Cajas y taco** (con la col 92 rellena: escalones de 1, 2, 4, 4 y 6). La subida toma 1.85 s (antes 1.78 s, con el salto sobre el hueco). Con 20 semillas distintas para las chispas, el bot sube y baja el taco arrancando en **cualquier** momento del ciclo del pulpo (antes fallaba arrancando entre 2.2 s y 3.4 s). No es que sea seguro: arrancando entre 2.4 s y 2.8 s alguna chispa llega a tocar el borde del hitbox, pero no entra en el margen de 2 px; y quedarse parado en la cima durante las ráfagas mata en 5-7 de cada 10. El último salto (de la col 92 a la cima) hay que soltarlo a tiempo: con la flecha apretada se pasa por encima de la columna de 6 (mide 32 px) y cae al piso del lado del pulpo.

## 9. Detalles que afectan al arte

- **Hueco de la col 92: resuelto.** Ahora tiene cajas en las filas 9-12 y el arte ya viene así.
- **Taco: resuelto.** `market_back.png` trae la columna del mercado detrás del taco.
- **Lado derecho de la columna de 6:** si el jugador cae al piso entre la columna y doña Carmen (por ejemplo, pasándose en el último salto), no puede volver: la columna mide 96 px y no hay otra subida. No queda atascado: con el taco arriba, el pulpo lo mata en la primera ráfaga (medido entre x 1530 y 1590; en x 1620 no lo alcanza) y la sala se reinicia; con el taco abajo, doña Carmen está ahí para terminar. Pero perder todo el recorrido por pasarse del salto es duro. No es del arte, pero conviene saberlo.
- **Los toldos se atraviesan desde abajo:** que se lean como lona, no como tablas.
- **Madera y lata del mostrador:** tienen que distinguirse muy bien a simple vista; es la regla del tramo de las carnes.
- **Las cajas de 6 escudan del pulpo casi todo:** las chispas que llegan a la cima son las que pasan rozando por encima de la columna.
- **Caja de diálogo:** ocupa los últimos 56 px de la pantalla; con la cámara abajo tapa casi todo el piso (filas 13-16).
