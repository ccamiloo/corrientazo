# Brief de arte: nivel 2, sala 1, la calle (`street_1`)

Fuente de verdad: `src/data/rooms/street_1.js` (layout y entidades) y `src/config/constants.js` (`CABLE`, `PUDDLE`). Si este documento y esos archivos difieren, mandan los archivos.

## 1. Layout

Tal como está en el archivo (17 filas de 80 caracteres, de arriba hacia abajo):

```
................................................................................
..............................P.................................................
..............................P.................................................
..............................P.................................................
..............................P.................................................
..............................P.................................................
..............................P.................................................
..............................P.................................................
..............................P............TTTTTTTTTTTTTTTTTTTT.................
..............................P............|..................|.................
..............................P..........S.|..................|.................
................CCCCCC........P..........S.|..................|.................
................CCCCCC.....BBBP........AAAA|........BB...M....|.................
################################################################################
################################################################################
################################################################################
################################################################################
```

La misma grilla con número de fila a la izquierda y regla de columnas arriba (decenas en la primera línea, unidades en la segunda), solo para ubicarse:

```
     00000000001111111111222222222233333333334444444444555555555566666666667777777777
     01234567890123456789012345678901234567890123456789012345678901234567890123456789
  0  ................................................................................
  1  ..............................P.................................................
  2  ..............................P.................................................
  3  ..............................P.................................................
  4  ..............................P.................................................
  5  ..............................P.................................................
  6  ..............................P.................................................
  7  ..............................P.................................................
  8  ..............................P............TTTTTTTTTTTTTTTTTTTT.................
  9  ..............................P............|..................|.................
 10  ..............................P..........S.|..................|.................
 11  ................CCCCCC........P..........S.|..................|.................
 12  ................CCCCCC.....BBBP........AAAA|........BB...M....|.................
 13  ################################################################################
 14  ################################################################################
 15  ################################################################################
 16  ################################################################################
```

Los charcos, las tapas de alcantarilla, el cable, la tienda, el vecino, el teléfono y la salida **no están en el layout**: son entidades (sección 4).

## 2. Leyenda

| Carácter | Qué es | Colisión |
|---|---|---|
| `#` | Suelo de la calle (4 filas) | Sólido por los cuatro lados |
| `C` | Carro parqueado (6 x 2 tiles) | Sólido por los cuatro lados |
| `B` | Banca: la del arco del cable (cols 27-29) y la del paradero (cols 52-53) | Sólido por los cuatro lados |
| `A` | Andén elevado (1 tile) | Sólido por los cuatro lados |
| `S` | Cartelera del paradero (1 x 2, sobre el andén) | Sólido por los cuatro lados |
| `M` | Matera (1 x 1) | Sólido por los cuatro lados |
| `T` | Techo del paradero | Sólido por los cuatro lados |
| `P` | Poste dañado | Decorativo, sin colisión: el jugador pasa por delante |
| `\|` | Columna del paradero | Decorativa, sin colisión |
| `.` | Vacío (aire o cielo) | Sin colisión |

No hay plataformas de un solo sentido: el techo del paradero bloquea también desde abajo (golpea la cabeza al saltar debajo de él).

## 3. Dimensiones

- Tile: 16 x 16 px.
- Sala: 80 x 17 tiles = **1280 x 272 px**.
- Pantalla del juego: 480 x 270 px. Se ve algo más de un tercio de la sala a lo ancho y casi toda a lo alto (la cámara solo se mueve 2 px en vertical). Se escala por un entero, con filtrado NEAREST.
- Personaje jugable: hitbox de 16 x 32 px; los sprites miden 24 x 32 px (la hitbox va centrada).
- Superficie de la calle: fila 13, **y = 208 px**. Todo lo que está en la calle se apoya ahí.

## 4. Entidades

Convenciones (las mismas de la casa):
- `x` = columna; `y` = fila del tile **sobre el que se apoya**. La coordenada es la de **los pies**: centro horizontal de la columna (`x · 16 + 8`) y borde superior de la fila (`y · 16`).
- Las entidades se dibujan con origen **abajo al centro**, salvo charcos, tapas y salida, cuyo `x` es la **columna izquierda**.
- Los tamaños son los de los placeholders actuales.

| Entidad | Tiles (x, y) | Pies en px (x, y) | Tamaño placeholder | Esquina sup. izq. en px | Sección |
|---|---|---|---|---|---|
| Spawn del jugador | (2, 13) | (40, 208) | 16 x 32 (hitbox) | (32, 176) | A |
| Vecino | (6, 13) | (104, 208) | 16 x 28 | (96, 180) | A |
| Ancla del cable (punta del poste) | (30, 1) | (488, 16) | punto | - | B |
| Teléfono de la tienda | (69, 13) | (1112, 208) | 12 x 18 | (1106, 190) | D |
| Salida | cols 77-78, apoyada en la fila 13, 2 x 3 tiles | centro abajo (1248, 208) | 32 x 48 | (1232, 160) | D |

**Charcos** (zonas sin colisión sobre la calle; hoy se dibujan como una franja de 3 px de alto, y 205-208):

| Charco | Columnas | x en px | Ancho | Saltos hasta P2 | Retraso de la ola |
|---|---|---|---|---|---|
| P1 | 10-12 | 160-208 | 3 tiles | 1 | 0.25 s |
| P2 (origen, bajo el arco) | 23-38 | 368-624 | 16 tiles | 0 | 0 s |
| P3a | 43-45 | 688-736 | 3 tiles | 1 | 0.25 s |
| P3b | 48-51 | 768-832 | 4 tiles | 2 | 0.5 s |
| P3c | 54-56 | 864-912 | 3 tiles | 3 | 0.75 s |
| P3d | 59-62 | 944-1008 | 4 tiles | 4 | 1 s |

**Conexiones** (chorritos de agua, solo visuales: no matan ni colisionan): P1-P2, P2-P3a, P3a-P3b, P3b-P3c, P3c-P3d. Hoy son una línea de 1 px en y = 207 entre el borde de un charco y el siguiente. Pasan por detrás del carro, el andén, la banca del paradero y la matera.

**Islas secas entre charcos** (sección C): tapa de alcantarilla en cols 46-47 (x 736-768); banca del paradero, cols 52-53; matera (col 57) más tapa (col 58, x 928-944). Las tapas son planas (sin colisión), solo visuales.

**Tienda** (fachada de fondo, sin colisión): tiles x 64, y 5, 11 x 8 (px: 1024, 80, 176 x 128), con un toldo de 6 px arriba. El teléfono está delante.

**Estados que el arte tiene que mostrar:**
- Cable: con luz (oscila, chispas en la punta) y sin luz (cuelga vertical, quieto, sin chispas).
- Charco: apagado (azul), aviso (azul con destellos, titila 0.4 s antes de electrificarse) y electrificado (hoy amarillo con un zigzag negro). Los chorritos también se ponen amarillos con la ola.
- Salida: cerrada (bloquea) y abierta (se cruza caminando). Hoy reutiliza las texturas de la puerta de la casa.
- Sobre el vecino, el teléfono y la salida cerrada aparece el indicador de interacción (11 x 11 px, unos 10 px por encima de su borde superior).

## 5. Alturas

Todas medidas desde la superficie de la calle (fila 13, y = 208).

| Elemento | Columnas | Filas | Tope (tiles / y px) | Notas |
|---|---|---|---|---|
| Calle | 0-79 | 13-16 | 0 / 208 | 4 filas: regla de la caja de diálogo |
| Carro | 16-21 | 11-12 | 2 / 176 | Plataforma de espera, fuera del alcance del cable |
| Banca del arco | 27-29 | 12 | 1 / 192 | Pegada al poste (su borde derecho está en x = 480) |
| Poste | 30 | 1-12 | 12 / 16 | Hoy una franja de 4 px centrada (x 486-490) |
| Andén | 39-42 | 12 | 1 / 192 | |
| Cartelera del paradero | 41 | 10-11 | 3 / 160 | Escalón hacia el techo |
| Techo del paradero | 43-62 | 8 | 5 / 128 | Su cara de abajo está a 4 tiles (y = 144) |
| Columnas del paradero | 43 y 62 | 9-12 | - | Decorativas |
| Banca del paradero | 52-53 | 12 | 1 / 192 | Isla seca |
| Matera | 57 | 12 | 1 / 192 | Isla seca |

**Cable:** ancla en (488, 16), largo 192 px (hasta el suelo). Con ±40° de amplitud la punta recorre un arco de x ≈ 365 a x ≈ 611; en los extremos queda a 45 px del suelo (y ≈ 163) y abajo del todo toca la calle en (488, 208).

## 6. Cómo se dibuja hoy

- **Con arte (actual):** `street1_back.png` (fachada de la tienda, vidrio del paradero) va en (0, 0) con depth -50 y `street1_tiles.png` (todo lo sólido más poste, columnas y tapas) en (0, 0) con depth 0. RoomBuilder no dibuja tile por tile cuando la sala trae `art.tiles`; la colisión sigue saliendo del layout.
- **Charcos:** piezas de 16 x 7 de `props/street_1/puddle.png`, una por columna en el rango exacto de cada charco (izquierda, medios alternando a/b, derecha), con el borde de arriba en y = 207. Apagado = fila off; aviso = alterna las filas warn y off cada 80 ms; electrificado = alterna live_a y live_b cada 100 ms. **Chorritos:** línea de 1 px dibujada por código en y = 213 (#5aa6de apagado, #ffd43a electrificado).
- **Cable:** línea recta de 2 px (#2b2638) del ancla a la punta, dibujada por código (la colisión se calcula sobre esa línea). **Chispas:** `cable_spark.png` (17 x 17) centrado en la punta, animación de 4 frames a 14 fps; sin luz, frame 4 fijo (punta pelada).
- **Teléfono:** `phone.png`, frame 0 colgado y frame 1 (bocina levantada) mientras está abierto el diálogo de la llamada. **Salida:** `exit_barrier.png` (32 x 48), frame 0 cerrada y frame 1 abierta, con el mismo cuerpo de colisión que antes.
- **Vecino:** `npcs/vecino.png` (24 x 32, origen en los pies): barre (`sweep`) mientras el jugador está lejos, lo mira en `idle` cuando se acerca y anima `talk` mientras se escribe cada línea.
- Sin arte (si algún archivo no carga) se dibuja el greybox anterior: tiles por código, charcos con `Graphics`, chispas como puntitos.

**Orden de profundidad** (de atrás hacia adelante; mayor = encima):

| Depth | Qué |
|---|---|
| -100 a -97 | Fondo con parallax `street` (con bruma), fijo a la cámara |
| -50 | `street1_back.png`: fachada de la tienda y vidrio del paradero |
| 0 | `street1_tiles.png`: calle, carro, bancas, andén, cartelera, techo, matera, poste, columnas y tapas |
| 1 | Charcos y chorritos (encima de la cara de arriba de la calle) |
| 10 | Cable, vecino, teléfono, salida |
| 11 | Chispas del cable |
| 20 | Jugador |
| 30 | Indicador de interacción |
| 100 | Interfaz fija a la pantalla: caja de diálogo |
| 200 | Overlay de debug (F1) |

Consecuencias: el agua va **delante** de la calle pero, como está en y = 207-214 (sobre la cara de la calle, debajo de la base de los sólidos), no tapa el carro, el andén, las bancas ni la matera. El cable pasa **delante** del poste y **detrás** del jugador.

**Fondo:** parallax de la calle anclado a la superficie (y = 208).

## 7. Métricas

**Salto** (las mismas de la casa; `constants.js`: salto 340 px/s, gravedad 900 subiendo y 1440 cayendo, velocidad máxima 130 px/s):

| | px | tiles |
|---|---|---|
| Altura máxima (botón mantenido) | 61.4 | 3.8 |
| Distancia a velocidad máxima, en plano | 88.8 | 5.5 |
| Distancia subiendo 2 tiles | 78 | 4.9 |

Subidas de la sala: calle → carro 2, calle → andén 1, andén → cartelera 2, cartelera → techo 2 (con 1 tile de separación horizontal). El salto plano más largo es P1 (3 tiles). Bajo el techo del paradero quedan 4 tiles libres: banca y matera se suben con un salto corto (un salto completo pega la cabeza contra el techo, sin consecuencias).

**Cable** (`CABLE` en constants.js): amplitud ±40°, periodo 4.5 s, electrifica P2 mientras la punta está a menos de 12° de la vertical (unos 0.44 s en cada pasada, una vez cada 2.25 s). Alcance: de pie en la calle, el cable llega hasta 6.6 tiles del poste; sobre algo de 1-2 tiles de alto, hasta 7.7 (la punta en el extremo). El carro y el andén quedan 0.8 tiles (13 px) fuera de ese alcance.

**Cruce del cable** (medido con un bot): esperar en el carro, saltar a la banca cuando el cable se aleja hacia la derecha, quedarse en la banca mientras la punta toca P2 y correr al andén antes de que el cable vuelva. Ventanas: 0.6 s para saltar del carro y 0.8 s para arrancar desde la banca. Con periodo 3 s el cruce resultó imposible; con 4 s, ventanas de 0.3 y 0.6 s.

**Ruta baja de la sección C:** la ola recorre P3a → P3d en 1 s y se repite cada 2.25 s; cada charco se cruza en menos de 0.9 s si se arranca justo después de que pasa la ola.

## 8. Detalles que afectan al arte

- **La banca del arco es la clave del cruce:** el jugador se para encima mientras P2 está electrificado, a medio tile del cable vertical. Conviene que se lea claramente como sólida y seca.
- **El poste es decorativo**, pero su punta es el ancla del cable: el arte tiene que poner el punto de amarre en (488, 16).
- **Los charcos son zonas exactas:** el jugador muere si pisa uno electrificado con más de 4 px de su hitbox adentro. Un charco dibujado más ancho que su zona engañaría.
- **Islas de 2 tiles:** las tapas son planas y secas; si se dibujan con agua encima parecerán peligrosas.
- **El techo del paradero** es sólido por debajo (4 tiles libres). Una lona fina que parezca atravesable confundiría. Las columnas no tienen colisión.
- **La cartelera** es el único escalón hacia el techo: tiene que parecer algo a lo que se puede subir.
- **Caja de diálogo:** ocupa los últimos 56 px de la pantalla; con la cámara abajo tapa casi todo el suelo (filas 13-16). Ahí sirve asfalto o cimiento sin detalles importantes.
- **Salida:** cols 77-78, delante del final de la calle. Hoy usa el placeholder de la puerta de la casa; el nivel termina al pasar la mitad del vano.
