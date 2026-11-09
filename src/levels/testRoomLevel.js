import { Npc } from '../entities/Npc.js';
import { Interactable } from '../entities/Interactable.js';
import { Hazard } from '../entities/Hazard.js';
import { tileToFeet } from '../systems/RoomBuilder.js';

// Lógica de la sala de prueba: NPC que avisa del cable, cable energizado que se mueve y teléfono
// para llamar al técnico (desenergiza el cable). Movida tal cual desde GameScene.
export function createTestRoomLevel(scene) {
  const { room, dialog } = scene;
  const phoneFlag = room.phone.flag;

  const npcPos = tileToFeet(room.npc);
  const npc = new Npc(scene, npcPos.x, npcPos.y, 'npc', {
    dialogBox: dialog,
    getLines: () => (scene.flag(phoneFlag) ? room.npc.dialog.afterCall : room.npc.dialog.default),
    onOpen: scene.freeze,
    onClose: scene.unfreeze,
  });

  // Obstáculo: room.hazard está en tiles salvo w/h/range (px); lo convertimos a px de mundo.
  const hz = room.hazard;
  const hzFeet = tileToFeet(hz);
  const hazard = new Hazard(scene, { ...hz, x: hzFeet.x - 8, y: hzFeet.y });
  const overlap = scene.physics.add.overlap(scene.player, hazard, () => scene.die());
  const disableHazard = () => {
    hazard.disable();
    overlap.active = false;
  };
  if (scene.flag(phoneFlag)) disableHazard();

  const phonePos = tileToFeet(room.phone);
  const phone = new Interactable(scene, phonePos.x, phonePos.y, 'phone', {
    onInteract: () => {
      scene.freeze();
      if (scene.flag(phoneFlag)) {
        dialog.open(room.phone.dialog.already, scene.unfreeze);
        return;
      }
      // El flag se marca al terminar la llamada, así el obstáculo desaparece al cerrar el diálogo.
      dialog.open(room.phone.dialog.call, () => {
        scene.setFlag(phoneFlag, true);
        disableHazard();
        scene.unfreeze();
      });
    },
  });

  // `disableHazard` queda expuesto para las pruebas automatizadas (antes era GameScene.disableHazard).
  return { interactables: [npc, phone], disableHazard };
}
