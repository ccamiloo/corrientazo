// Diálogos del nivel 4 (el mercado). PROVISIONALES: falta la versión definitiva.
// Marcadores de género ({mijo}, {Mijo}, {o}...): ver GENDER_WORDS en src/data/characters.js.

export const marketDialogs = {
  vendedor: {
    first: [
      '¡Cuidado, {mijo}! Con el aguacero se mojaron todos los enganches del mercado.',
      'Aquí medio mundo está pegado a ese poste con cables piratas, pelados y empalmados con cinta.',
      'Fíjese en la luz del congelador del pescado: cuando se pone roja, todo lo que está pelado o mojado se prende.',
      'Y en el mostrador de las carnes, párese en la madera, no en la lata: esa nevera vieja da corriente.',
    ],
    again: ['Cuando la luz del congelador se ponga roja, quietic{o} donde no haya agua ni cables.'],
  },
  carmen: {
    warn: [
      '¡Quiet{o} ahí, {mijo}! ¡No se acerque al pulpo, que está botando chispas!',
      'Le conecté la licuadora, la nevera, el ventilador, el radio y el cargador a la misma toma, y se recalentó.',
      'El taco está allá arriba, encima de las cajas. Bájelo, pero cuando el pulpo deje de chispear.',
    ],
    done: [
      '¡Ay, gracias, {mijo}! Ya desconecto todo.',
      'Una toma no aguanta tantos aparatos juntos: se recalienta y se puede prender candela.',
      'Y esos enganches los voy a reportar: una conexión pirata, pelada y mojada es un peligro para todo el mercado.',
      'Tome, los jugos para sus corrientazos. ¡Bien fríos!',
    ],
  },
  end: 'Doña Carmen te dio los jugos. ¡Nivel completado!',
  // Tip de la pantalla de Game Over según la causa de la muerte.
  deathTips: {
    puddle: 'Nunca dejes extensiones ni empalmes en el piso mojado: el agua conduce la electricidad.',
    hookup: 'Las conexiones ilegales (enganches) son peligrosas: cables pelados, mal empalmados y al alcance de la gente.',
    metal: 'Si un aparato o un mostrador de metal "da corriente", no lo toques: puede faltarle el polo a tierra.',
    pulpo: 'No conectes muchos aparatos a una misma toma o multitoma: se recalienta y puede incendiarse.',
  },
};
