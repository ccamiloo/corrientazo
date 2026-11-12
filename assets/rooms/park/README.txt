Arte de la sala park (nivel 3), generado desde src/data/rooms/park.js.

park_back.png   1600x272, en (0,0), origen (0,0), depth -1 (DEPTH.tiles - 1).
                Postes y línea eléctrica (y = 48), marco del columpio, faroles con la caja destapada,
                astas de las mangas, árbol completo (tronco, ramas y copa tocando la línea en CP1 y CP2),
                cometas enredadas, espaldar de la banca, letreros, arco de la cancha, camioneta de la empresa.
park_tiles.png  1600x272, en (0,0), origen (0,0), depth 0.
                Suelo de pasto, escalones, torres, puente y asiento de la banca. La colisión sale del layout.

Props (assets/props/park/, ver props.json):
  grass_live   16x10, 8 frames: 0-3 frame A (izq, medio_a, medio_b, der), 4-7 frame B. Borde de arriba en y = 200.
  swing_seat   24x6. Borde de arriba = cara sólida del asiento. Cadena: línea de 1 px 0x8e8a9c del pivote al centro del asiento.
  windsock     24x24, 6 frames: 0-1 calma, 2-3 aviso, 4-5 ráfaga (alternar a/b para que ondee). Amarre en el pixel (21, 2).
  tree_spark   6x6, 2 frames (anim "fall"). Centro = la chispa.
  cp_flash     17x17, 4 frames (anim "flash", una vez). Centrado en CP1/CP2 al empezar la ráfaga.
  tree_live    240x168, 2 frames (anim "buzz"). Esquina en (776, 40). Solo durante la ráfaga.
