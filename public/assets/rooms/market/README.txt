Arte de la sala market (nivel 4), generado desde src/data/rooms/market.js.
IMPORTANTE: el arte asume el arreglo del hueco de la col 92 (cajas de 4 de alto en las filas 9-12, ver el prompt).

market_back.png   1760x272, en (0,0), origen (0,0), depth -1.
                  Fondos de los puestos (pescadería, carnicería, verduras, jugos), poste con transformador,
                  manojo de enganches con sus partes CON forro (bajantes, amarres y empalmes con cinta),
                  congelador (sin la luz), extensión con empalme y multitoma, palos de los toldos,
                  columna del mercado donde va el taco, mostrador de doña Carmen con licuadoras y los cables al pulpo.
market_tiles.png  1760x272, en (0,0), origen (0,0), depth 0. Piso, cajas, puesto de frutas, mostrador madera/lata.

Props (assets/props/market/, ver props.json):
  puddle         16x7, igual al de la calle (filas off / warn / live_a / live_b; piezas izq, medio_a, medio_b, der). y = 207.
  awning         16x12, 8 frames: 0-3 toldo 1 (azul), 4-7 toldo 2 (verde); izq, medio_a, medio_b, der.
                 Borde de arriba = cara sólida. Al rebotar, bajar el sprite 2 px durante AWNING.sagMs.
  hookup_spark   9x9, anim "crackle". Dos o tres por tramo pelado mientras está prendido.
  metal_live     16x16, anim "buzz". Encima de cada tile 'm' mientras está prendido (depth 1).
  freezer_light  16x10, centro en (192, 166): 0 apagada, 1 roja, 2 roja con brillo. Aviso: alternar 0/1; prendido: 2.
  freezer_waves  40x24, anim "hum", esquina en (172, 134). Solo prendido.
  cart           32x16, anim "roll" mientras se mueve. Mismo rect que el cuerpo (y 192-208).
  pulpo          32x24, origen abajo al centro en (1600, 208): anims idle, warn, burst y smoke (al bajar el taco; termina en el frame 5, apagado).
  pulpo_spark    6x6, anim "fly", centrado en cada chispa.
  breaker        16x20 en (1504, 72): 0 prendido, 1 apagado.
Tramos pelados (H1-H4): Graphics de 2 px. Apagado 0xb87333 (cobre), aviso alterna cobre / 0xffe14a, prendido 0xffe14a.
