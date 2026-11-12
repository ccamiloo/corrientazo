Props de la obra. Coordenadas en px de mundo (sala de 1920x272). "esquina" = arriba a la izquierda.

concrete (16x6): piezas L, M, M, R por fila. Filas: 0 mojado, 1-2 aviso (alternar), 3-4 vivo (alternar). frame = fila*4 + pieza.
  Cubrir C1 (x 208-288) y C2 (x 336-416) con piezas de 16, esquina en y 202. Depth 1.
mixer (64x40): esquina en (388,168). Anims: idle, shake (aviso), spin (girando). Trae el cable roto hasta la punta pelada (392,207). Depth 10.
spark (9x9, crackle): centrada en (392,206) mientras la mezcladora gira. También 2 chispas en el extremo de la viga (≈1676,124) en el aviso de la onda.
spark_blue (9x9): libre, por si quieren chispas celestes extra.
arc (40x118, strike): centrado en x del tramo, esquina y 11 (va de la línea al tablón). Solo en la fase arc. Depth 10.
line_spark (32x10, crackle): centrado en (centro del tramo, 12) durante el aviso del tramo.
plank_fx (16x7): sobre cada 16 px del tramo, esquina y 127. Anim warn en el aviso, lit con el arco.
trolley (16x8, roll): centrado en x del carro, esquina y 26. Va ENCIMA del cable.
load (44x12, buzz): esquina en (xCarro-22, bordeArribaCarga-2). El rect que mata (40x8) coincide con su parte de adentro.
  Cable del gancho: línea de 1 px color 0x1e1822 de (xCarro, 30) al borde de arriba de la carga.
boom_spark (12x8, zap una vez): esquina en (1026,10), la punta de la grúa pegada a la línea.
beam_wave (16x8, run): 3 piezas desde (centro-24) en y 120, recortadas a x 1296-1680. Depth -1 (los tablones W la tapan).
casco (20x36): origen abajo al centro en los pies del casco (808,128) y (1288,128). Anims: idle, take (una vez), taken.
