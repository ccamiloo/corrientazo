// Habitación de prueba.
//
// `layout`: una string por fila de tiles (16x16). '#' = sólido, '.' = vacío.
// Mide 60x28 tiles = 960x448 px: más ancha y más alta que la pantalla (480x270),
// para probar el seguimiento de cámara en los dos ejes.
// El suelo tiene 4 tiles de grosor a propósito: así, con la cámara pegada al fondo de la sala,
// la caja de diálogo (abajo) no tapa al jugador.
//
// Las posiciones de entidades van en coordenadas de tile:
//   x = columna, y = fila del tile sobre el que se apoya (los pies quedan en el borde superior de esa fila).

export const testRoom = {
  id: 'testRoom',

  layout: [
    '############################################################', // 0  techo
    '#..........................................................#', // 1
    '#..........................................................#', // 2
    '#..........................................................#', // 3
    '#..........................................................#', // 4
    '#..........................................................#', // 5
    '#..........................................................#', // 6
    '#..........................................................#', // 7
    '#..........................................................#', // 8
    '#..........................................................#', // 9
    '#..........................................................#', // 10
    '#..........................................................#', // 11
    '#.######...................................................#', // 12 plataforma 4 (la más alta)
    '#..........................................................#', // 13
    '#..........................................................#', // 14
    '#.........######...........................................#', // 15 plataforma 3
    '#..........................................................#', // 16
    '#..........................................................#', // 17
    '#.................######...................................#', // 18 plataforma 2
    '#..........................................................#', // 19
    '#..........................................................#', // 20
    '#.........######...........................................#', // 21 plataforma 1
    '#..........................................................#', // 22
    '#..........................................................#', // 23
    '############################################################', // 24 suelo
    '############################################################', // 25
    '############################################################', // 26 suelo grueso: deja espacio bajo
    '############################################################', // 27 los pies para la caja de diálogo
  ],

  spawn: { x: 3, y: 24 },

  npc: {
    x: 7,
    y: 24,
    dialog: {
      default: [
        '¡Hola! Cuidado con ese cable de allá: está suelto y energizado.',
        'Con el viento se mueve de lado a lado. Si lo tocas, te llevas un corrientazo.',
        'Al fondo hay un teléfono. Lo correcto es llamar a un técnico, no arreglarlo uno mismo.',
      ],
      afterCall: [
        '¡Bien hecho! El técnico cortó la corriente desde el tablero.',
        'Con la electricidad no se improvisa: siempre llama a alguien calificado.',
      ],
    },
  },

  // Obstáculo: rectángulo (en px) que va de x a x + range con un tween de ida y vuelta.
  hazard: { x: 28, y: 24, w: 16, h: 16, range: 14 * 16, duration: 2200 },

  phone: {
    x: 56,
    y: 24,
    flag: 'technicianCalled',
    dialog: {
      call: [
        'Marcas el número del técnico electricista...',
        '"Ya voy para allá. Mientras tanto, corté el circuito desde el tablero."',
      ],
      already: ['Ya llamaste al técnico. El cable está desenergizado.'],
    },
  },
};
