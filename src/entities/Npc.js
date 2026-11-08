import { Interactable } from './Interactable.js';

// NPC: un Interactable cuyo diálogo puede cambiar según los flags de la habitación.
// `getLines` devuelve las líneas actuales (la escena decide cuáles según el estado).
export class Npc extends Interactable {
  constructor(scene, x, y, textureKey, { getLines, dialogBox, onOpen, onClose }) {
    super(scene, x, y, textureKey, {
      onInteract: () => {
        onOpen?.();
        dialogBox.open(getLines(), onClose);
      },
    });
  }
}
