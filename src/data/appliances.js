// Aparatos desconectables.
//   `sprite`: nombre del prop con arte (props.json de la sala) → textura `prop-<sprite>`, frame 0 encendido
//             y frame 1 desconectado. Si no cargó, se usa el placeholder.
//   Placeholder: PreloadScene genera `appliance-<kind>` (color propio) y `appliance-<kind>-off` (gris).
// Tamaños del placeholder en px; todos se apoyan en el suelo (origen abajo al centro).
export const APPLIANCES = {
  radio: { w: 14, h: 10, color: 0xe0a458, sprite: 'radio' },
  tv: { w: 22, h: 16, color: 0x5ec8e5, sprite: 'tv' },
  console: { w: 14, h: 6, color: 0xb48ead, sprite: 'consola' },
  charger: { w: 6, h: 10, color: 0x9be564, sprite: 'cargador' },
  blender: { w: 10, h: 18, color: 0xf2668b, sprite: 'licuadora' },
};

export const propKey = (sprite) => `prop-${sprite}`;

export const applianceKey = (kind, on = true) => `appliance-${kind}${on ? '' : '-off'}`;
