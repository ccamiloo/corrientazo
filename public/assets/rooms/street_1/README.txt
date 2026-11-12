Arte de la sala street_1 (la calle), generado desde src/data/rooms/street_1.js.

street1_back.png   1280x272, en (0,0), origen (0,0), depth -50.
                   Fachada de la tienda (con toldo y cartelito LLAMADAS), vidrio del
                   paradero con afiches, canastas de gaseosa. Sin colisión.
street1_tiles.png  1280x272, en (0,0), origen (0,0), depth 0.
                   Todo lo sólido (calle, carro, bancas, andén, cartelera, techo, matera)
                   más el poste con su abrazadera en (488,16), las columnas del paradero,
                   las tapas de alcantarilla y los cables buenos del poste.
                   La colisión sigue saliendo del layout: no tocarla.

Charcos y chorritos van ENCIMA de los tiles (depth 1), en la cara de arriba de la calle:
  charcos: piezas de 16x7 de props/street_1/puddle.png con el borde de arriba en y = 207
  chorritos: línea de 1 px en y = 213. Apagado #5aa6de, electrificado #ffd43a.
Cable: línea de 2 px #2b2638 del ancla a la punta; chispas = cable_spark.png centrado en la punta.
