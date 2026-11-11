import { GAME_W, GAME_H, TILE, DEPTH, COLORS, FONT } from '../config/constants.js';
import { Interactable } from '../entities/Interactable.js';
import { Cable } from '../entities/Cable.js';
import { PuddleNetwork } from '../systems/PuddleNetwork.js';
import { tileToFeet, findGroundY } from '../systems/RoomBuilder.js';
import { PlayTimer } from '../systems/PlayTimer.js';
import { street1Dialogs as D } from '../data/dialogs/street_1.js';

// Nivel 2, sala 1: la calle.
//
// Peligros: el cable culebra (péndulo con luz, mata al tocarlo en cualquier punto) y los charcos, que se
// electrifican en ola cuando la punta del cable toca el charco de origen en la parte baja del arco.
//
// Misión (flags de la sala, persisten en el registry aunque el jugador muera):
//   talkedToNeighbor → el teléfono ya permite llamar
//   powerCut         → cable quieto y sin chispas, charcos apagados para siempre, salida abierta
export function createStreet1Level(scene) {
  const { room, dialog, player } = scene;

  const say = (lines, onClose) => {
    scene.freeze();
    dialog.open(lines, () => {
      scene.unfreeze();
      onClose?.();
    });
  };

  // --- Fondo de la tienda (sin colisión, detrás de todo lo jugable) ---
  const shop = room.shop;
  scene.add
    .rectangle(shop.x * TILE, shop.y * TILE, shop.w * TILE, shop.h * TILE, COLORS.shop)
    .setOrigin(0)
    .setDepth(DEPTH.interior);
  scene.add // toldo
    .rectangle(shop.x * TILE - 4, shop.y * TILE, shop.w * TILE + 8, 6, COLORS.shopAwning)
    .setOrigin(0)
    .setDepth(DEPTH.interior);

  // --- Tapas de alcantarilla (islas secas, solo visuales) ---
  for (const m of room.manholes) {
    scene.add
      .rectangle(m.x * TILE + 2, m.y * TILE - 2, m.w * TILE - 4, 2, COLORS.manhole)
      .setOrigin(0)
      .setDepth(DEPTH.tiles - 1);
  }

  // --- Cable ---
  // Largo = del ancla al suelo: la punta toca el suelo justo cuando el cable cuelga vertical.
  const anchor = tileToFeet(room.cable);
  const cable = new Cable(scene, { x: anchor.x, y: anchor.y, length: findGroundY(room) - anchor.y });

  // --- Charcos ---
  // El origen se electrifica cuando la punta está en la parte baja del arco Y dentro del charco
  // (con la sala actual la punta siempre cae dentro de P2, pero así no depende de eso).
  const sourceData = room.puddles.find((p) => p.id === room.cable.puddle);
  const sourceOn = (t) => {
    if (!cable.isLowAt(t)) return false;
    const tipX = cable.tipAt(cable.angleAt(t)).x;
    return tipX >= sourceData.x * TILE && tipX <= (sourceData.x + sourceData.w) * TILE;
  };
  const puddles = new PuddleNetwork(scene, {
    puddles: room.puddles,
    links: room.puddleLinks,
    sourceId: room.cable.puddle,
    sourceOn,
  });

  // --- Vecino ---
  const neighborData = room.npcs.find((n) => n.id === 'neighbor');
  const neighborPos = tileToFeet(neighborData);
  const neighbor = new Interactable(scene, neighborPos.x, neighborPos.y, neighborData.texture, {
    onInteract: () => {
      if (scene.flag('powerCut')) say(D.neighbor.done);
      else if (scene.flag('talkedToNeighbor')) say(D.neighbor.pending);
      else say(D.neighbor.first, () => scene.setFlag('talkedToNeighbor'));
    },
  });

  // --- Salida (como la puerta de la casa: sólida mientras está cerrada) ---
  const exitData = room.exit;
  const exit = new Interactable(scene, (exitData.x + exitData.w / 2) * TILE, exitData.y * TILE, 'door-closed', {
    onInteract: () => say(D.exit.locked),
  });
  scene.physics.add.existing(exit, true);
  scene.physics.add.collider(player, exit);
  let exitOpen = false;
  const openExit = () => {
    if (exitOpen) return;
    exitOpen = true;
    exit.setTexture('door-open');
    scene.physics.world.disable(exit);
    exit.radius = -1; // abierta no muestra indicador: se cruza caminando
  };

  // Corte de luz: `immediate` al reconstruir la sala con el flag ya puesto (tras morir o reiniciar).
  const cutPower = (immediate) => {
    cable.cut(immediate);
    puddles.cut();
    openExit();
  };

  // --- Teléfono de la tienda ---
  const phonePos = tileToFeet(room.phone);
  const phone = new Interactable(scene, phonePos.x, phonePos.y, 'phone', {
    onInteract: () => {
      if (!scene.flag('talkedToNeighbor')) say(D.phone.notYet);
      else if (scene.flag('powerCut')) say(D.phone.already);
      else {
        // El corte se aplica al cerrar el diálogo, para que se vea pasar (y la línea "dejó de echar chispas").
        say(D.phone.call, () => {
          scene.setFlag('powerCut');
          cutPower(false);
        });
      }
    },
  });

  if (scene.flag('powerCut')) cutPower(true);

  // --- Fin de la sala: cruzar la salida abierta ---
  let finished = false;
  const exitLeft = exitData.x * TILE;
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
    interactables: [neighbor, phone, exit],
    cable,
    puddles,
    // Tip de Game Over según la causa (GameScene.die la pasa a GameOver).
    deathTip: (cause) => D.deathTips[cause],
    update(time, delta) {
      cable.update(delta);
      puddles.update(cable.elapsed);
      if (finished) return;

      // Muerte: primero el cable (todo su largo), después los charcos electrificados.
      if (cable.hits(player.body)) scene.die('cable');
      else if (puddles.liveUnder(player.body)) scene.die('puddle');

      if (exitOpen && player.x > exitLeft + TILE) finish();
    },
  };
}
