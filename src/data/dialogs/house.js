// Diálogos del nivel 1 (casa).
// Cada diálogo es una lista de líneas; la caja avanza una línea por pulsación de interactuar.
// Marcadores: `{n}` desconectados, `{total}` total de aparatos, `{left}` los que faltan.
//
// Orden de la misión: papá → abuela → aparatos. La abuela no responde hasta hablar con papá y los
// aparatos no responden hasta hablar con la abuela (houseLevel usa `canInteract`), por eso no hay
// líneas de "todavía no" para ellos.

export const houseDialogs = {
  dad: {
    first: [
      '¡Buenos días! Por fin te levantaste.',
      'Anoche cayó un aguacero tenaz. Se fue la luz como tres veces.',
      'Hoy no hay almuerzo en la casa, así que vas a ir donde la Seño a comprar tres corrientazos: uno para ti, uno para tu abuela y uno para mí.',
      'Pero antes de salir, me desconectas todo. Con tanta humedad, no quiero nada enchufado mientras no estamos.',
      'Tu abuela está arriba en la terraza colgando la ropa. Ella te explica cómo se hace.',
    ],
    // Si le vuelves a hablar sin haber terminado (antes o después de ver a la abuela).
    pending: ['¿Ya desconectaste todo? Sin eso no hay corrientazo.'],
    done: ['¡Eso! Ahora sí, ve. Y te vas por el andén, mirando bien la calle.'],
  },
  grandma: {
    lesson: [
      'Ajá, tu papá ya me contó. Te voy a enseñar a desconectar bien.',
      'Primero lo primero: las manos bien secas. Agua y electricidad nunca juntas.',
      'Segundo: siempre jalas del enchufe, nunca del cable. Si jalas el cable, se daña por dentro y después puede dar corriente.',
      'Hay cinco cosas conectadas en la casa. Empieza por mi radio, que está aquí al lado.',
    ],
    pending: ['Manos secas y del enchufe, no del cable. ¿Cuántas te faltan?'],
    // PROVISIONAL: falta la línea de la abuela con todo desconectado.
    done: ['¡Muy bien! Ya está todo desconectado.'],
  },
  // Línea al desconectar cada aparato (por id del aparato en house.js).
  unplugged: {
    radio: ['Listo. La abuela va a tener que cantar ella misma.'],
    tv: ['Chao, TV. Nadie te estaba viendo de todas formas.'],
    console: ['Desconectada. Nada de dejar los videojuegos enchufados al salir.'],
    charger: ['El celular ya cargó. El cargador tampoco se queda enchufado.'],
    blender: ['Esta queda lejos del lavaplatos y desconectada.'],
  },
  // Se agrega después de la línea del aparato que completa el total.
  allUnplugged: ['¡Listo, todo desconectado! Ahora sí, a buscar esos corrientazos.'],
  door: {
    locked: ['Todavía no puedo salir. Me falta desconectar cosas ({left} de {total}).'],
  },
  end: 'Fin del nivel 1',
};
