// Diálogos del nivel 3 (el parque). PROVISIONALES: falta la versión definitiva.
// Marcadores de género ({mijo}, {Mijo}, {o}...): ver GENDER_WORDS en src/data/characters.js.

export const parkDialogs = {
  tomas: {
    first: [
      '¡Ey! Se me enredó la cometa en los cables de la cancha.',
      'Me iba a subir al árbol a bajarla... ¿Cómo así que no? ¿Que el árbol está pegado a los cables?',
      'Uy, es verdad: con este viento las ramas se pegan a la línea y echan chispas. Mejor no.',
      'Allá al fondo hay un técnico de la empresa de energía. Si llegas hasta él, dile que me ayude.',
      'Ojo: con la tormenta se destaparon las cajas de los faroles y el pasto alrededor quedó electrificado. Pasa por los juegos.',
      'Y cuando sople duro, cuidado saltando, que el viento te devuelve.',
    ],
    again: ['¿Ya hablaste con el técnico? Yo me quedo aquí quietico, lejos de los cables.'],
  },
  tecnico: {
    talk: [
      'Buenos días. ¿Una cometa enredada? Sí, ya la vi.',
      'Hizo bien en no dejar que su amigo la bajara. Un hilo enredado en la red, y más si está mojado, puede conducir la corriente.',
      'Primero cortamos la energía de este tramo y la bajo con esta pértiga aislada. Y ese árbol lo vamos a podar, que ya está tocando la línea.',
      'Y dígale a su amigo: las cometas se elevan lejos de los cables, en espacios abiertos y nunca con hilo metálico.',
    ],
  },
  end: 'Tomás recuperó su cometa. ¡Nivel completado!',
  // Tip de la pantalla de Game Over según la causa de la muerte.
  deathTips: {
    grass: 'Si ves una caja eléctrica destapada o un farol dañado, aléjate y avisa: el pasto mojado alrededor puede estar electrificado.',
    spark: 'Nunca te quedes debajo de un árbol que toca los cables: puede soltar chispas y estar energizado.',
    tree: 'Nunca te subas ni toques un árbol que esté cerca de los cables: puede estar energizado.',
    string: 'Nunca intentes bajar una cometa enredada en los cables. El hilo, sobre todo mojado, puede conducir la electricidad.',
  },
};
