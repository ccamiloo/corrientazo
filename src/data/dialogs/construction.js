// Diálogos del nivel 5 (la obra). PROVISIONALES: falta la versión definitiva.
// Marcadores de género ({mijo}, {Mijo}, {o}...): ver GENDER_WORDS en src/data/characters.js.

export const constructionDialogs = {
  maestro: {
    first: [
      '¡Ey, {mijo}! Por aquí no se puede pasar así no más: esto es una obra.',
      'Y mire esa línea de alta tensión: esta construcción quedó demasiado cerca.',
      'Con alta tensión no hace falta tocar el cable: si uno se arrima mucho, la corriente salta como un rayo.',
      'Si va a cruzar, fíjese bien: cuando algo brille, quítese de ahí. Y coja los cascos que hay en el camino.',
    ],
    again: ['Cuando algo brille, quítese de ahí. Sin afanes.'],
  },
  ingeniera: {
    talk: [
      '¡Llegaste! Ya pedí que desenergizaran la línea y paramos la grúa.',
      'Esta obra nunca debió montarse tan cerca de la red: hay que respetar la distancia de seguridad.',
      'Ni varillas, ni andamios, ni escaleras metálicas, ni grúas cerca de los cables. El arco salta aunque no los toques.',
      'Por esa escalera sales derechito al restaurante de la Seño. ¡Ese sí es el único corrientazo que vale la pena!',
    ],
  },
  end: '¡Llegaste al restaurante de la Seño!',
  // Tip de la pantalla de Game Over según la causa de la muerte.
  deathTips: {
    line: 'Nunca toques ni te acerques a una línea de alta tensión.',
    concrete: 'Nunca uses máquinas con el cable roto, y menos sobre piso mojado o concreto fresco.',
    arc: 'Con alta tensión no hace falta tocar: si te acercas mucho, la corriente puede saltar en forma de arco.',
    crane: 'Grúas, varillas y andamios metálicos deben mantenerse lejos de las redes: si tocan la línea, todo queda energizado.',
    beam: 'El metal conduce la electricidad: si una estructura metálica queda energizada, la corriente la recorre entera.',
  },
};
