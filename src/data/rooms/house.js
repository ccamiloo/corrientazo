// Nivel 1: la casa (tutorial). Tres pisos apilados en vertical.
//
// FORMATO (fijo: este archivo se usa para generar el arte)
// `layout`: una string por fila de tiles de 16x16, de arriba hacia abajo. Mide 60 x 29 tiles = 960 x 464 px.
//   '#'  estructura sólida: muros, losas entre pisos y suelo
//   'E'  escalón (sólido)
//   'T'  techo de la terraza (sólido)
//   '|'  columna del techo (decorativa, SIN colisión)
//   '.'  vacío
// Posiciones en coordenadas de tile: x = columna, y = fila del tile sobre el que se apoya
// (los pies quedan en el borde superior de esa fila). Las zonas usan { x, y, w, h } en tiles
// (columna y fila de la esquina superior izquierda, ancho y alto).
//
// Métricas con las que se diseñó (constants.js, medidas en el juego):
//   salto máximo 61 px (4 tiles NO se alcanzan), cómodo 2 tiles → escalones de 2 tiles de alto,
//   pegados o con 1 tile de separación. Alto libre de cada piso: 7 tiles (un salto completo necesita 6).
//   Los escalones desde los que se salta hacia la losa de arriba quedan dentro del hueco de la losa,
//   para que la cabeza no choque; bajo los escalones flotantes quedan 5 tiles libres para caminar.
//
// Pisos (fila de apoyo → alto libre):
//   Piso 3, terraza:     fila 9  → filas 2-8   (techo T en la fila 1, cols 14-45, sobre columnas)
//   Piso 2, habitación:  fila 17 → filas 10-16
//   Piso 1, sala/cocina: fila 25 → filas 18-24 (4 filas de suelo debajo: regla de la caja de diálogo)
// Escaleras de ida y vuelta: los escalones bajos se apoyan en el suelo y suben en un sentido; el último
// es una plataforma flotante que vuelve en sentido contrario y deja al jugador en el lado PRINCIPAL del
// piso de arriba (el que conecta con el resto del nivel).
// Escalera A (piso 1 ↔ 2, a la derecha): hueco en la fila 17, cols 39-47.
//   A1 tope fila 23, cols 42-45 · A2 tope fila 21, cols 46-48 · A3 flotante tope fila 19, cols 40-43
//   → se sale a la losa por la col 38. R (tope fila 23, cols 49-50) deja volver desde el lado de la puerta.
//   La losa a la derecha del hueco (cols 48-58) no es alcanzable: es solo techo del piso 1.
// Escalera B (piso 2 ↔ 3, a la izquierda, pegada al muro): hueco en la fila 9, cols 2-10.
//   B1 tope fila 15, cols 4-7 · B2 tope fila 13, cols 1-3 · B3 flotante tope fila 11, cols 6-9
//   → se sale a la terraza por la col 11.

export const house = {
  id: 'house',
  background: 'house', // parallax del amanecer (se ve desde la terraza y por las ventanas)
  script: 'house', // lógica del nivel: src/levels/houseLevel.js

  layout: [
    '............................................................', // 0  cielo
    '..............TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT..............', // 1  techo de la terraza (T)
    '..............|...............|..............|..............', // 2  terraza: alto libre 7 (filas 2-8)
    '..............|...............|..............|..............', // 3
    '..............|...............|..............|..............', // 4
    '..............|...............|..............|..............', // 5
    '..............|...............|..............|..............', // 6
    '..............|...............|..............|..............', // 7
    '..............|...............|..............|..............', // 8
    '##.........#################################################', // 9  piso de la terraza (apoyo) + hueco escalera B (cols 2-10)
    '#..........................................................#', // 10 habitación: alto libre 7 (filas 10-16)
    '#.....EEEE.................................................#', // 11 escalón B3 (flotante)
    '#..........................................................#', // 12
    '#EEE.......................................................#', // 13 escalón B2
    '#EEE.......................................................#', // 14
    '#EEEEEEE...................................................#', // 15 escalón B1
    '#EEEEEEE...................................................#', // 16
    '#######################################.........############', // 17 piso de la habitación (apoyo) + hueco escalera A (cols 39-47)
    '#..........................................................#', // 18 sala/cocina: alto libre 7 (filas 18-24)
    '#.......................................EEEE...............#', // 19 escalón A3 (flotante)
    '#..........................................................#', // 20
    '#.............................................EEE..........#', // 21 escalón A2
    '#.............................................EEE..........#', // 22
    '#.........................................EEEEEEEEE........#', // 23 escalón A1 y R
    '#.........................................EEEEEEEEE........#', // 24
    '############################################################', // 25 suelo (apoyo del piso 1)
    '############################################################', // 26
    '############################################################', // 27
    '############################################################', // 28 4 filas de suelo bajo el piso 1
  ],

  // Arte de la sala (public/assets/rooms/house/, ver README.txt ahí). Ambas imágenes miden lo mismo que
  // la sala (960x464) y van en (0, 0) del mundo. `tiles` reemplaza el dibujo tile por tile (la colisión
  // sigue saliendo del layout); `props` trae los sprites de aparatos y puerta.
  art: {
    wall: 'assets/rooms/house/house_wall.png', // pared del fondo, depth -50
    tiles: 'assets/rooms/house/house_tiles.png', // estructura sólida, depth 0
    props: 'assets/props/house/props.json',
  },

  // Zona interior de la casa (pared del fondo, pisos 1 y 2). Solo se usa si no cargó `art.wall`:
  // entonces se pinta un rectángulo oscuro (greybox).
  interior: { x: 1, y: 10, w: 58, h: 15 },

  spawn: { x: 30, y: 17 }, // piso 2, habitación

  npcs: [
    { id: 'dad', texture: 'papa', x: 24, y: 25 }, // piso 1
    { id: 'grandma', texture: 'abuela', x: 24, y: 9 }, // piso 3, bajo el techo
  ],

  // Aparatos a desconectar. `kind` elige el placeholder (src/data/appliances.js).
  appliances: [
    { id: 'radio', kind: 'radio', x: 38, y: 9 }, // piso 3
    { id: 'tv', kind: 'tv', x: 21, y: 17 }, // piso 2
    { id: 'console', kind: 'console', x: 24, y: 17 }, // piso 2
    { id: 'charger', kind: 'charger', x: 34, y: 17 }, // piso 2
    { id: 'blender', kind: 'blender', x: 8, y: 25 }, // piso 1, cocina
  ],

  // Puerta de salida: x = columna izquierda, w x h en tiles. Cerrada bloquea el paso.
  // `sprite`: prop con arte (frame 0 cerrada, frame 1 abierta).
  door: { x: 57, y: 25, w: 2, h: 3, sprite: 'puerta' },

  // Avisos del tutorial: aparecen una sola vez. `trigger: 'start'` al entrar; si no, al pisar la zona.
  // `requires`: flag de misión necesario para que el aviso pueda aparecer.
  // `prompt`: id del texto en src/systems/prompts.js (versión de teclado o táctil según el modo).
  hints: [
    { id: 'move', prompt: 'hintMove', trigger: 'start', doneWhen: 'moved' },
    // La escalera A se baja cayendo por el hueco; el salto hace falta recién para volver a subir,
    // después de hablar con papá. Por eso el aviso espera a ese momento.
    { id: 'jump', prompt: 'hintJump', zone: { x: 33, y: 18, w: 9, h: 7 }, requires: 'talkedToDad', doneWhen: 'jumped' },
    { id: 'talk', prompt: 'hintTalk', zone: { x: 17, y: 18, w: 15, h: 7 }, doneWhen: 'talked' },
  ],
};
