// Diálogos del nivel 1 (casa). Textos PROVISIONALES: se reescriben después.
// Cada diálogo es una lista de líneas; la caja avanza una línea por pulsación de interactuar.
// `{n}` y `{total}` se reemplazan por el contador de aparatos desconectados.

export const houseDialogs = {
  dad: {
    first: ['¡Buenos días! Hoy viene la tormenta.', 'Ve a la terraza: la abuela te necesita.'],
    waiting: ['La abuela está en la terraza. Sube por la escalera.'],
    mission: ['Desconecta todo lo que puedas antes de que llegue la tormenta.'],
    done: ['¡Todo desconectado! Ya podemos salir.'],
  },
  grandma: {
    locked: ['Hola, mijo. Primero saluda a tu papá, que está abajo.'],
    first: [
      'Con tormenta, los aparatos enchufados se pueden dañar.',
      'Desconecta los 5 que hay en la casa: tira del enchufe, no del cable.',
    ],
    mission: ['Te faltan aparatos: llevas {n} de {total}.'],
    done: ['¡Muy bien! Ya está todo desconectado.'],
  },
  appliance: {
    needDad: ['Primero tengo que hablar con mi papá.'],
    needGrandma: ['La abuela me va a enseñar cómo hacerlo.'],
    unplugged: ['Desconectado. ({n}/{total})'],
    already: ['Este ya está desconectado.'],
  },
  door: {
    locked: ['La puerta está cerrada. Antes de salir hay que desconectar todo ({n}/{total}).'],
  },
  end: 'Fin del nivel 1',
};
