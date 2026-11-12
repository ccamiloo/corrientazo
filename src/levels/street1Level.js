import * as Phaser from 'phaser';
import { TILE, DEPTH, COLORS } from '../config/constants.js';
import { Interactable } from '../entities/Interactable.js';
import { NpcActor } from '../entities/NpcActor.js';
import { Cable } from '../entities/Cable.js';
import { PuddleNetwork } from '../systems/PuddleNetwork.js';
import { tileToFeet, findGroundY } from '../systems/RoomBuilder.js';
import { street1Dialogs as D } from '../data/dialogs/street_1.js';
import { propKey } from '../data/appliances.js';

const STREET_EXIT_FADE_MS = 500; // fundido al salir hacia el parque

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

  // `hooks` (opcional): ganchos de DialogBox (el vecino anima 'talk'; el teléfono levanta la bocina).
  const say = (lines, onClose, hooks) => {
    scene.freeze();
    dialog.open(
      lines,
      () => {
        scene.unfreeze();
        onClose?.();
      },
      hooks,
    );
  };

  // Arte de la sala (room.art): ¿cargó cada pieza? Sin ella se dibuja el greybox de antes.
  const hasArt = (key) => scene.textures.exists(key);
  const propsData = scene.cache.json.get(`${room.id}-props`) ?? {};

  // --- Fondo: fachada de la tienda y vidrio del paradero (sin colisión, detrás de todo lo jugable) ---
  if (hasArt(`${room.id}-wall`)) {
    scene.add.image(0, 0, `${room.id}-wall`).setOrigin(0).setDepth(DEPTH.interior);
  } else {
    const shop = room.shop;
    scene.add
      .rectangle(shop.x * TILE, shop.y * TILE, shop.w * TILE, shop.h * TILE, COLORS.shop)
      .setOrigin(0)
      .setDepth(DEPTH.interior);
    scene.add // toldo
      .rectangle(shop.x * TILE - 4, shop.y * TILE, shop.w * TILE + 8, 6, COLORS.shopAwning)
      .setOrigin(0)
      .setDepth(DEPTH.interior);
  }

  // --- Tapas de alcantarilla (islas secas, solo visuales): con arte ya vienen en street1_tiles.png ---
  if (!hasArt(`${room.id}-tiles`)) {
    for (const m of room.manholes) {
      scene.add
        .rectangle(m.x * TILE + 2, m.y * TILE - 2, m.w * TILE - 4, 2, COLORS.manhole)
        .setOrigin(0)
        .setDepth(DEPTH.tiles - 1);
    }
  }

  // --- Cable ---
  // Largo = del ancla al suelo: la punta toca el suelo justo cuando el cable cuelga vertical.
  const anchor = tileToFeet(room.cable);
  const cable = new Cable(scene, {
    x: anchor.x,
    y: anchor.y,
    length: findGroundY(room) - anchor.y,
    spark: { key: propKey('cable_spark'), anim: `${propKey('cable_spark')}-spark`, deadFrame: propsData.cable_spark?.dead },
  });

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
    artKey: propKey('puddle'),
  });

  // --- Vecino: barre ('sweep') hasta que el jugador se acerca; entonces para y lo mira ---
  const neighborData = room.npcs.find((n) => n.id === 'neighbor');
  const neighborPos = tileToFeet(neighborData);
  const neighbor = new NpcActor(scene, neighborPos.x, neighborPos.y, neighborData.texture, {
    ambient: () => 'sweep',
    onInteract: () => {
      const hooks = neighbor.dialogHooks(player);
      if (scene.flag('powerCut')) say(D.neighbor.done, null, hooks);
      else if (scene.flag('talkedToNeighbor')) say(D.neighbor.pending, null, hooks);
      else say(D.neighbor.first, () => scene.setFlag('talkedToNeighbor'), hooks);
    },
  });

  // --- Salida (como la puerta de la casa: sólida mientras está cerrada) ---
  // Con arte: valla con conos (exit_barrier, 32x48 como el placeholder: el cuerpo de colisión no cambia).
  // Frame 0 cerrada, 1 abierta. Sin arte: las texturas de la puerta de la casa.
  const exitData = room.exit;
  const barrier = hasArt(propKey('exit_barrier'));
  const exit = new Interactable(
    scene,
    (exitData.x + exitData.w / 2) * TILE,
    exitData.y * TILE,
    barrier ? propKey('exit_barrier') : 'door-closed',
    { frame: barrier ? 0 : undefined, onInteract: () => say(D.exit.locked) },
  );
  scene.physics.add.existing(exit, true);
  scene.physics.add.collider(player, exit);
  let exitOpen = false;
  const openExit = () => {
    if (exitOpen) return;
    exitOpen = true;
    if (barrier) exit.setFrame(1);
    else exit.setTexture('door-open');
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
  // Con arte: frame 0 colgado; frame 1 (bocina levantada) mientras está abierto el diálogo de la llamada.
  const phonePos = tileToFeet(room.phone);
  const phoneArt = hasArt(propKey('phone'));
  const phone = new Interactable(scene, phonePos.x, phonePos.y, phoneArt ? propKey('phone') : 'phone', {
    frame: phoneArt ? 0 : undefined,
    onInteract: () => {
      if (!scene.flag('talkedToNeighbor')) say(D.phone.notYet);
      else if (scene.flag('powerCut')) say(D.phone.already);
      else {
        // El corte se aplica al cerrar el diálogo, para que se vea pasar (y la línea "dejó de echar chispas").
        if (phoneArt) phone.setFrame(1);
        say(
          D.phone.call,
          () => {
            scene.setFlag('powerCut');
            cutPower(false);
          },
          { onClose: () => phoneArt && phone.setFrame(0) },
        );
      }
    },
  });

  if (scene.flag('powerCut')) cutPower(true);

  // --- Fin de la sala: cruzar la salida abierta lleva al parque (nivel 3) ---
  // Fundido a negro y la misma GameScene con otra sala. El timer sigue corriendo (es la misma partida);
  // los flags del parque empiezan vacíos porque son de otra sala.
  let finished = false;
  const exitLeft = exitData.x * TILE;
  const finish = () => {
    finished = true;
    scene.freeze();
    const cam = scene.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start('Game', { roomId: 'park' }));
    cam.fadeOut(STREET_EXIT_FADE_MS, 0, 0, 0);
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
      neighbor.update(player);
      if (finished) return;

      // Muerte: primero el cable (todo su largo), después los charcos electrificados.
      if (cable.hits(player.body)) scene.die('cable');
      else if (puddles.liveUnder(player.body)) scene.die('puddle');

      if (exitOpen && player.x > exitLeft + TILE) finish();
    },
  };
}
