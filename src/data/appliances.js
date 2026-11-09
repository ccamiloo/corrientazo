// Placeholders de los aparatos desconectables. PreloadScene genera dos texturas por tipo:
//   `appliance-<kind>`      encendido (color propio)
//   `appliance-<kind>-off`  desconectado (gris)
// Tamaños en px; se apoyan en el suelo (origen abajo al centro).
export const APPLIANCES = {
  radio: { w: 14, h: 10, color: 0xe0a458 },
  tv: { w: 22, h: 16, color: 0x5ec8e5 },
  console: { w: 14, h: 6, color: 0xb48ead },
  charger: { w: 6, h: 10, color: 0x9be564 },
  blender: { w: 10, h: 18, color: 0xf2668b },
};

export const applianceKey = (kind, on = true) => `appliance-${kind}${on ? '' : '-off'}`;
