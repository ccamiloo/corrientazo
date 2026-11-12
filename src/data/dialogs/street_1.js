// Diálogos del nivel 2, sala 1 (la calle). PROVISIONALES: falta la versión definitiva.
// Marcadores de género ({mijo}, {Mijo}, {o}...): ver GENDER_WORDS en src/data/characters.js.

export const street1Dialogs = {
  neighbor: {
    first: [
      '¡Quiet{o} ahí, {mijo}! No dé un paso más.',
      'Con el aguacero de anoche se reventó un cable del poste. Está colgando y echando chispas.',
      'Y mire cómo quedó la calle: todo encharcado. El agua conduce la electricidad.',
      'Cuando la punta del cable toca el charco grande, la corriente se riega por todos los charcos que están conectados.',
      'Hay que llamar a la empresa de energía para que corten la luz. El teléfono de la tienda queda al final de la cuadra.',
      'Si va a pasar, no pise los charcos cuando titilen. Y al cable, ni mirarlo de cerca.',
    ],
    pending: ['¿Ya llamó? Mientras no corten la luz, esa calle es un peligro.'],
    done: ['¡Bien hecho, {mijo}! Ya cortaron la luz. Ahora sí se puede pasar tranquil{o}.'],
  },
  phone: {
    // Antes de hablar con el vecino.
    notYet: ['Primero voy a ver qué le pasa al vecino.'],
    call: [
      'Marcas el número de la empresa de energía...',
      '"Gracias por avisar. Ya cortamos el circuito de ese sector; no se acerque al cable hasta que llegue la cuadrilla."',
      'El cable dejó de echar chispas.',
    ],
    already: ['Ya cortaron la luz. La cuadrilla viene en camino.'],
  },
  exit: {
    locked: ['No puedo seguir así. Primero hay que llamar para que corten la luz.'],
  },
  // Tip de la pantalla de Game Over según la causa de la muerte.
  deathTips: {
    puddle: 'El agua conduce la electricidad: si un cable cae cerca de un charco, no lo pises.',
    cable: 'Un cable caído puede estar energizado. Aléjate y llama a la empresa de energía.',
  },
};
