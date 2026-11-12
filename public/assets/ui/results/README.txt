Pantallas de nombre y tabla de tiempos (resolución 480x270). Fondo: el mismo de la selección (calle, oscurecida
con rectángulo 0x141022 alpha 150/255). Fuente: la pixel del juego. OJO: la fuente NO tiene '#' ni '°'.

NOMBRE (NameEntryScene)
- ne_ticket.png (232x136): comanda. Esquina en (196,70).
  Nombre del jugador: pixelText escala 2, color 0x2b1e2e, sin contorno, en (212,127). Si a escala 2 mide más de 196 px, usar escala 1 en (212,133).
  Cursor: rectángulo 2x18 color 0xd9483b, 2 px a la derecha del texto, y 129; titila cada 400 ms.
  Contador "N/12": color 0x7a6a5e, alineado a la derecha en x 412, y 110.
  Cabecita del personaje (lb_heads) en (268,160); nombre del personaje en (292,164), color 0x2b1e2e.
- Personaje elegido x2 (48x64) con pies en y 178, x 60; pedestal de selección x2 (80x28) en (64,178).
- Título "¿Cómo te llamas?" amarillo 0xffe45c, contorno, escala 2, centrado, y 22.
- Pie: "Escribe tu nombre" alineado a la derecha en x 228 y "Enter para confirmar" desde x 252, y 236.

TABLA (LeaderboardScene)
- lb_board.png (296x254) en (10,8). Ya trae título y encabezados.
- Filas: 10, la fila i (0-9) en y = 66 + i*18.
    Puesto: i<3 → lb_medals.png (3 frames 12x12: oro, plata, bronce) en (24, y+2); si no, número color 0xc4d2c8 alineado a la derecha en x 36.
    Cabecita: lb_heads.png (5 frames de 20x18, orden: moises, camilo, evelyn, sebastian, danna), mostrar 20x16 en (42, y).
    Nombre en (68, y+2). Tiempo m:ss.cc alineado a la derecha en x 246. lb_bolt.png (7x10) en (254, y+3) y muertes en (265, y+2).
    Color normal 0xf0ece2; la fila del jugador en amarillo 0xffe45c.
  Fila del jugador: lb_row_hi.png (2 frames de 282x18, alternar cada 400 ms) en (17, y-1).
- lb_card.png (156x204) en (316,8): tarjeta "Tu corrientazo".
    Personaje x2 (48x64) con esquina en (368,34) (pies sobre el pedestal de la tarjeta).
    Nombre: escala 2, blanco con contorno, centrado en x 392, y 112.
    Valores alineados a la derecha en x 458: tiempo en y 136 (blanco), "N de TOTAL" en y 158 (amarillo), muertes en y 180 (blanco) con lb_bolt 10 px a la izquierda.
- Pie "Presiona cualquier tecla" centrado en x 392, y 236.
Referencias: docs/mockups/mockup_nombre_x3.png, mockup_tabla_x3.png, mockup_tabla_fuera_top_x3.png
