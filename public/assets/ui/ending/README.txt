Escena final (EndingScene), 480x270. Coordenadas en px de pantalla; "esquina" = arriba a la izquierda.
Sprites de MEDIA resolución (comida, bandeja, vapor, confeti, personajes) van a ESCALA 2. Lo demás, a escala 1.

end_bg.png (480x270): fondo del restaurante, en (0,0). Ya trae el tablero con "Corrientazo del día" y las 5 casillas.
end_counter.png (480x270): mostrador, en (0,0), ENCIMA de la Seño y DEBAJO de bandeja y comida.
seno (npcs/seno.png, 24x32, escala 2, flipX para mirar a la izquierda): origen abajo al centro en (290,222).
  Anims: idle, talk, serve (brazos hacia la bandeja), cheer (brazos arriba).
Jugador (su sheet, escala 2): origen abajo al centro; entra caminando de x -30 a x 96, pies en y 250.
end_tray.png (52x4, escala 2): esquina (150,194).
end_food.png (5 frames de 16x12, escala 2; orden: sopa, patacón, seco, jugo, postre): frame i con esquina en (146 + i*20, 170).
end_steam.png (4 frames 8x10, escala 2, 6 fps): esquina (154,150) cuando ya está la sopa.
end_tick.png (12x10, escala 1): chulito i en (22, 117 + i*12).
end_title.png (3 frames 266x50, ola suave 5 fps): esquina (107,6).
end_banner.png (147x24): centrado en x 240, esquina y 56.
end_confetti.png (8 frames 4x4, escala 2): partículas.
end_receipt.png (140x192): esquina final (330,72). Valores con pixelText color 0x2b1e2e:
  nombre escala 2 en (338,122); tiempo alineado a la derecha en x 462, y 205; muertes alineado a la derecha en x 462, y 218.
end_stamp.png (86x52): esquina (376,146).
end_hint.png (2 frames 196x17): esquina (67,252), alternar cada 450 ms.
Referencias: docs/mockups/mock_final_x2.png (las 4 fases), mock_final_titulo_x3.png, mock_final_recibo_x3.png.
