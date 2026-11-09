import { GAME_W, GAME_H, TILE, DEPTH, COLORS, FONT } from '../config/constants.js';
import { Interactable } from '../entities/Interactable.js';
import { tileToFeet } from '../systems/RoomBuilder.js';
import { TutorialHints } from '../systems/TutorialHints.js';
import { PlayTimer } from '../systems/PlayTimer.js';
import { APPLIANCES, applianceKey, propKey } from '../data/appliances.js';
import { houseDialogs as D } from '../data/dialogs/house.js';

// Nivel 1: la casa (tutorial). No hay peligros: no se puede morir.
//
// Misión (flags de la sala, persisten en el registry):
//   talkedToDad        → recién entonces se puede hablar con la abuela
//   talkedToGrandma    → activa el objetivo "Desconectar: n/5"; recién entonces responden los aparatos
//   unplugged_<id>     → aparato desconectado (deja de responder)
// Lo que todavía no toca no muestra el indicador ni responde (Interactable.canInteract).
// Con todos desconectados se abre la puerta; al cruzarla termina el nivel.
export function createHouseLevel(scene) {
  const { room, dialog, player } = scene;
  const total = room.appliances.length;

  const count = () => room.appliances.filter((a) => scene.flag(`unplugged_${a.id}`)).length;
  const fill = (lines) =>
    lines.map((l) =>
      l.replaceAll('{n}', count()).replaceAll('{total}', total).replaceAll('{left}', total - count()),
    );
  // Abre un diálogo con el jugador congelado y lo descongela al cerrarlo.
  const say = (lines, onClose) => {
    scene.freeze();
    dialog.open(fill(lines), () => {
      scene.unfreeze();
      onClose?.();
    });
  };

  // --- Pared del fondo: delante del parallax, detrás de los tiles ---
  // Con arte es una imagen del tamaño de la sala en (0, 0); ventanas y cielo de la terraza son
  // transparentes y dejan ver el parallax. Sin arte, un rectángulo oscuro en la zona interior (greybox).
  const wallKey = `${room.id}-wall`;
  if (scene.textures.exists(wallKey)) {
    scene.add.image(0, 0, wallKey).setOrigin(0).setDepth(DEPTH.interior);
  } else {
    const inner = room.interior;
    scene.add
      .rectangle(inner.x * TILE, inner.y * TILE, inner.w * TILE, inner.h * TILE, COLORS.interior)
      .setOrigin(0)
      .setDepth(DEPTH.interior);
  }

  // Aspecto de un objeto con dos estados (aparato encendido/desconectado, puerta cerrada/abierta).
  // Con arte: spritesheet del prop, frame 0 = estado inicial, frame 1 = estado final.
  // Sin arte: dos texturas placeholder. `create` son los argumentos de textura para el constructor.
  const look = (sprite, placeholderOn, placeholderOff) => {
    const key = sprite && propKey(sprite);
    if (key && scene.textures.exists(key)) {
      return { key, frame: 0, setDone: (obj) => obj.setFrame(1) };
    }
    return { key: placeholderOn, frame: undefined, setDone: (obj) => obj.setTexture(placeholderOff) };
  };

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
    else if (count() < total) say(D.dad.pending);
    else say(D.dad.done);
  });

  // La abuela no responde hasta haber hablado con papá.
  const grandma = makeNpc(
    'grandma',
    () => {
      if (!scene.flag('talkedToGrandma')) {
        say(D.grandma.lesson, () => {
          scene.setFlag('talkedToGrandma');
          refreshHud();
        });
      } else if (count() < total) say(D.grandma.pending);
      else say(D.grandma.done);
    },
    () => !!scene.flag('talkedToDad'),
  );

  function makeNpc(id, onInteract, canInteract) {
    const data = room.npcs.find((n) => n.id === id);
    const pos = tileToFeet(data);
    return new Interactable(scene, pos.x, pos.y, data.texture, { onInteract, canInteract });
  }

  // --- Puerta de salida ---
  const doorData = room.door;
  const doorLook = look(doorData.sprite, 'door-closed', 'door-open');
  const door = new Interactable(scene, (doorData.x + doorData.w / 2) * TILE, doorData.y * TILE, doorLook.key, {
    frame: doorLook.frame,
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
    doorLook.setDone(door);
    scene.physics.world.disable(door);
    door.radius = -1; // abierta ya no muestra el indicador: se cruza caminando
  };

  // --- Aparatos ---
  const appliances = room.appliances.map((a) => {
    const pos = tileToFeet(a);
    const aLook = look(APPLIANCES[a.kind].sprite, applianceKey(a.kind, true), applianceKey(a.kind, false));
    const it = new Interactable(scene, pos.x, pos.y, aLook.key, {
      frame: aLook.frame,
      // Solo responde después de la lección de la abuela y mientras siga conectado.
      canInteract: () => !!scene.flag('talkedToGrandma') && !scene.flag(`unplugged_${a.id}`),
      onInteract: () => {
        // El flag se marca antes del diálogo para que el conteo ya incluya este aparato.
        scene.setFlag(`unplugged_${a.id}`);
        aLook.setDone(it);
        refreshHud();
        const done = count() === total;
        // El último aparato agrega la línea de "todo desconectado" después de la suya.
        say([...D.unplugged[a.id], ...(done ? D.allUnplugged : [])], () => {
          if (done) openDoor();
        });
      },
    });
    // Estado inicial según flags (por si la escena se reinicia a mitad del nivel).
    if (scene.flag(`unplugged_${a.id}`)) aLook.setDone(it);
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
