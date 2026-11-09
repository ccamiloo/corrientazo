Nivel 1: la casa (sala "house", 60x29 tiles = 960x464 px)

backgrounds/house/   parallax del amanecer, mismas 4 capas, tamaños y factores
                     que los demás fondos (línea de suelo y = 256, anclada al
                     suelo del piso 1, y = 400).
rooms/house/
  house_wall.png     960x464, depth -50. Pared del fondo, muebles, columnas de
                     la terraza y ropa tendida. Ventanas y cielo de la terraza
                     transparentes: detrás se ve el parallax.
  house_tiles.png    960x464, depth 0. Toda la estructura sólida (#, E, T)
                     dibujada según su contexto. Reemplaza las imágenes de
                     16x16 por tile y las columnas. No cambia la colisión.
props/house/         aparatos y puerta, spritesheets de 2 frames en fila,
                     origen abajo al centro. props.json trae los tamaños.
  tv (28x30) y consola (18x18) tienen 12 filas transparentes abajo: se apoyan
  sobre el mueble del TV dibujado en house_wall.png.
  licuadora (26x34) trae su propio pedazo de mesón: el mesón del fondo deja el
  hueco exacto entre x = 123 y x = 149.
