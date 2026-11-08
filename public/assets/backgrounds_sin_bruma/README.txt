Fondos exteriores de Corrientazo (versión SIN la bruma extra del 30%)
=====================================================================

Carpetas: street (calle, mañana), park (parque, media mañana),
market (mercado, mediodía), construction (obra, mediodía).

Cada carpeta tiene las mismas 4 capas:
  layer_1_sky.png     480x270  factor 0     (fija a la cámara)
  layer_2_clouds.png  960x270  factor 0.05
  layer_3_far.png     960x400  factor 0.2
  layer_4_mid.png     960x400  factor 0.5

- Las capas de 960 px se repiten horizontalmente sin costura.
- Los factores aplican igual en horizontal y en vertical.
- Línea de suelo: fila y = 256 de cada capa. En la posición más baja de la
  cámara, esa fila coincide con la superficie del suelo de la sala.
- far y mid miden 400 px para que el parallax vertical nunca deje huecos.
- Pixel art: filtrado NEAREST, sin escalar.
