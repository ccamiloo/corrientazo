import { GAME_W, GAME_H, TILE, DEPTH, COLORS, FONT } from '../config/constants.js';
import { Interactable } from '../entities/Interactable.js';
import { tileToFeet } from '../systems/RoomBuilder.js';
import { TutorialHints } from '../systems/TutorialHints.js';
import { PlayTimer } from '../systems/PlayTimer.js';
import { applianceKey } from '../data/appliances.js';
import { houseDialogs as D } from '../data/dialogs/house.js';

// Nivel 1: la casa (tutorial). No hay peligros: no se puede morir.
//
// Misión (flags de la sala, persisten en el registry):
//   talkedToDad        → habilita el diálogo de la abuela
//   talkedToGrandma    → activa el objetivo "Desconectar: n/5" y deja desconectar los aparatos
//   unplugged_<id>     → aparato desconectado
// Con todos desconectados se abre la puerta; al cruzarla termina el nivel.
export function createHouseLevel(scene) {
  const { room, dialog, player } = scene;
  const total = room.appliances.length;

  const count = () => room.appliances.filter((a) => scene.flag(`unplugged_${a.id}`)).length;
  const fill = (lines) => lines.map((l) => l.replaceAll('{n}', count()).replaceAll('{total}', total));
  // Abre un diálogo con el jugador congelado y lo descongela al cerrarlo.
  const say = (lines, onClose) => {
    scene.freeze();
    dialog.open(fill(lines), () => {
      scene.unfreeze();
      onClose?.();
    });
  };

  // --- Pared interior (greybox): detrás de los pisos 1 y 2, delante del fondo de la ciudad ---
  const inner = room.interior;
  scene.add
    .rectangle(inner.x * TILE, inner.y * TILE, inner.w * TILE, inner.h * TILE, COLORS.interior)
    .setOrigin(0)
    .setDepth(DEPTH.interior);

  // --- HUD del objetivo ---
  const hud = scene.add
    .text(GAME_W - 6, 6, '', {
      fontFamily: FONT,
      fontSize: '10px',
      color: COLORS.text,
      backgroundColor: 'rgba(17,20,27,0.85)',
      padding: { x: 5, y: 3 },
    })
    .setOrigin(1, 0)
    .setScrollFactor(0)
    .setDepth(DEPTH.ui);
  const refreshHud = () => {
    hud.setVisible(!!scene.flag('talkedToGrandma'));
    hud.setText(`Desconectar: ${count()}/${total}`);
  };

  // --- NPCs ---
  const dad = makeNpc('dad', () => {
    if (!scene.flag('talkedToDad')) say(D.dad.first, () => scene.setFlag('talkedToDad'));
    else if (!scene.flag('talkedToGrandma')) say(D.dad.waiting);
    else if (count() < total) say(D.dad.mission);
    else say(D.dad.done);
  });

  const grandma = makeNpc('grandma', () => {
    if (!scene.flag('talkedToDad')) say(D.grandma.locked);
    else if (!scene.flag('talkedToGrandma')) {
      say(D.grandma.first, () => {
        scene.setFlag('talkedToGrandma');
        refreshHud();
      });
    } else if (count() < total) say(D.grandma.mission);
    else say(D.grandma.done);
  });

  function makeNpc(id, onInteract) {
    const data = room.npcs.find((n) => n.id === id);
    const pos = tileToFeet(data);
    return new Interactable(scene, pos.x, pos.y, data.texture, { onInteract });
  }

  // --- Puerta de salida ---
  const doorData = room.door;
  const door = new Interactable(scene, (doorData.x + doorData.w / 2) * TILE, doorData.y * TILE, 'door-closed', {
    onInteract: () => say(D.door.locked),
  });
  // Cerrada es un sólido estático (bloquea el paso). Al abrirla se desactiva su body con
  // physics.world.disable (no body.enable = false, que la seguiría dibujando en debug).
  scene.physics.add.existing(door, true);
  scene.physics.add.collider(player, door);
  let doorOpen = false;
  const openDoor = () => {
    if (doorOpen) return;
    doorOpen = true;
    door.setTexture('door-open');
    scene.physics.world.disable(door);
    door.radius = -1; // abierta ya no muestra el indicador: se cruza caminando
  };

  // --- Aparatos ---
  const appliances = room.appliances.map((a) => {
    const pos = tileToFeet(a);
    const it = new Interactable(scene, pos.x, pos.y, applianceKey(a.kind, true), {
      onInteract: () => {
        if (!scene.flag('talkedToDad')) return say(D.appliance.needDad);
        if (!scene.flag('talkedToGrandma')) return say(D.appliance.needGrandma);
        if (scene.flag(`unplugged_${a.id}`)) return say(D.appliance.already);
        // El flag se marca antes del diálogo para que "{n}" ya incluya este aparato.
        scene.setFlag(`unplugged_${a.id}`);
        it.setTexture(applianceKey(a.kind, false));
        refreshHud();
        say(D.appliance.unplugged, () => {
          if (count() === total) openDoor();
        });
      },
    });
    // Estado inicial según flags (por si la escena se reinicia a mitad del nivel).
    if (scene.flag(`unplugged_${a.id}`)) it.setTexture(applianceKey(a.kind, false));
    return it;
  });

  if (count() === total) openDoor();
  refreshHud();

  // --- Avisos del tutorial ---
  const hints = new TutorialHints(scene, room.hints);

  // --- Fin del nivel: cruzar la puerta abierta ---
  let finished = false;
  const doorLeft = doorData.x * TILE;
  const finish = () => {
    finished = true;
    scene.freeze();
    PlayTimer.pause(scene.registry);
    scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.6).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.ui);
    scene.add
      .text(GAME_W / 2, GAME_H / 2, D.end, { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.ui + 1);
  };

  return {
    interactables: [dad, grandma, door, ...appliances],
    update() {
      hints.update();
      // Cruzó la puerta: el centro del jugador pasó la mitad del vano, en el piso 1.
      if (!finished && doorOpen && player.x > doorLeft + TILE && player.body.bottom > (doorData.y - 1) * TILE) finish();
    },
  };
}
