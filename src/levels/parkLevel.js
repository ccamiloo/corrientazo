import * as Phaser from 'phaser';
import { GAME_W, GAME_H, TILE, DEPTH, COLORS, SWING, TREE_SPARK, GRASS, PUDDLE, PARK, CABLE } from '../config/constants.js';
import { pixelText } from '../systems/pixelText.js';
import { NpcActor } from '../entities/NpcActor.js';
import { KiteString } from '../entities/KiteString.js';
import { Wind, WindFx } from '../systems/Wind.js';
import { tileToFeet, findGroundY } from '../systems/RoomBuilder.js';
import { PlayTimer } from '../systems/PlayTimer.js';
import { parkDialogs as D } from '../data/dialogs/park.js';
import { propKey } from '../data/appliances.js';
import { legendOf } from '../systems/RoomBuilder.js';

const DEG = Math.PI / 180;

// ¿Se tocan dos rectángulos { left, top, right, bottom }? `m` recorta el primero por cada lado (rozar no mata).
const overlaps = (a, b, m = 0) => a.right - m > b.left && a.left + m < b.right && a.bottom - m > b.top && a.top + m < b.bottom;

// Nivel 3: el parque.
//
// Peligros (causas de muerte entre paréntesis):
//  - Pasto electrificado Z1 y Z2 alrededor de los faroles destapados: siempre activo ('grass').
//  - Árbol pegado a la línea: durante la ráfaga el tronco electrocuta ('tree') y de los dos puntos de contacto
//    caen chispas ('spark').
//  - Hilos de cometa colgando de la línea: siempre matan; solo se pasa por debajo cuando la ráfaga los sube ('string').
// El viento (Wind) empuja al jugador hacia la izquierda solo en el aire, durante la ráfaga.
// Todo usa el reloj propio de la sala (wind.elapsed, avanza con el delta del update), como el cable de la calle.
//
// Misión: talkedToTomas (solo cambia su diálogo). Hablar con el técnico termina el nivel.
export function createParkLevel(scene) {
  const { room, dialog, player } = scene;
  const groundY = findGroundY(room);
  // Azar con semilla: las chispas caen igual en cada intento (así las pruebas con bot son reproducibles).
  const rng = new Phaser.Math.RandomDataGenerator(['park']);

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

  // Arte de la sala (room.art): ¿cargó cada pieza? Sin ella se usa el greybox de respaldo.
  const hasArt = (key) => scene.textures.exists(key);
  const wallArt = hasArt(`${room.id}-wall`);

  // --- Fondo de la sala (park_back.png): postes, línea, marco del columpio, faroles, astas, árbol, cometas ---
  // Va en depth tiles - 1 y se crea ANTES que las mangas (misma profundidad): así las mangas quedan encima.
  if (wallArt) scene.add.image(0, 0, `${room.id}-wall`).setOrigin(0).setDepth(DEPTH.tiles - 1);

  // --- Viento ---
  const wind = new Wind();
  // Mangas: amarradas en la punta de cada asta 'W' (fila más alta de su columna).
  const sockAnchors = [];
  room.layout[0].split('').forEach((_, c) => {
    const top = room.layout.findIndex((row) => row[c] === 'W');
    if (top >= 0) sockAnchors.push({ x: c * TILE + TILE / 2, y: top * TILE + 2 });
  });
  const windFx = new WindFx(scene, wind, sockAnchors, rng, propKey('windsock'));

  // --- Decorado greybox (solo si no cargó park_back.png): línea eléctrica, copa del árbol, faroles, cometas ---
  const tree = room.tree;
  const [cp1, cp2] = tree.contacts;
  const deco = wallArt ? null : scene.add.graphics().setDepth(DEPTH.tiles - 1);
  if (deco) drawGreyboxDeco(deco);
  function drawGreyboxDeco(deco) {
    // Copa del árbol: llega hasta la línea entre los dos puntos de contacto. La línea se dibuja después, encima.
    deco.fillStyle(COLORS.canopy).fillEllipse((cp1.x + cp2.x) / 2, (cp1.y + tree.trunk.y) / 2 + 8, cp2.x - cp1.x + 24, tree.trunk.y - cp1.y + 40);
    const line = room.powerLine;
    deco.lineStyle(2, COLORS.powerLine).lineBetween(line.x1, line.y1, line.x2, line.y2);
    // Faroles: cabeza en la punta de cada columna 'L' y caja destapada (con su tapa caída) al pie.
    room.layout[0].split('').forEach((_, c) => {
      const top = room.layout.findIndex((row) => row[c] === 'L');
      if (top < 0) return;
      const x = c * TILE;
      deco.fillStyle(COLORS.lamp).fillRect(x + 3, top * TILE - 4, 10, 5);
      deco.fillStyle(0xfff3b0).fillRect(x + 5, top * TILE + 1, 6, 2);
      deco.fillStyle(0x5a5f69).fillRect(x + 10, groundY - 7, 6, 7); // caja
      deco.fillStyle(COLORS.liveGrass).fillRect(x + 12, groundY - 6, 2, 3); // cables a la vista
      deco.fillStyle(0x5a5f69).fillRect(x + 17, groundY - 2, 7, 2); // tapa caída
    });
    // Cometas enredadas en la línea: la de Tomás (rombo rosado) y una vieja rota (gris, con un pedazo caído).
    for (const k of room.kites) {
      if (k.id === 'tomas') {
        deco.fillStyle(COLORS.kite).fillTriangle(k.x - 7, k.y, k.x, k.y - 9, k.x + 7, k.y).fillTriangle(k.x - 7, k.y, k.x, k.y + 12, k.x + 7, k.y);
      } else {
        deco.fillStyle(COLORS.oldKite).fillTriangle(k.x - 6, k.y, k.x, k.y - 8, k.x + 5, k.y).fillTriangle(k.x + 2, k.y + 2, k.x + 8, k.y + 4, k.x + 3, k.y + 9);
      }
    }
  }

  // --- Pasto electrificado (zonas fijas, siempre activas) ---
  const grass = room.grass.map((z) => ({ ...z, left: z.x * TILE, right: (z.x + z.w) * TILE, surface: z.y * TILE }));
  // Con arte (grass_live, 16x10): una pieza por columna con el borde de arriba en surface + pieceOffsetY
  // (y = 200). Puntas en los extremos de la zona y medios alternando a/b; se saltan las columnas con un sólido
  // apoyado en el suelo (la torre 2 en Z2), pero las puntas de los extremos se dibujan siempre.
  // Frames: 0-3 = A (izquierda, medio_a, medio_b, derecha), 4-7 = B; A y B se alternan cada flickerMs.
  const grassArt = hasArt(propKey('grass_live'));
  const { isSolid } = legendOf(room);
  const grassPieces = [];
  if (grassArt) {
    for (const z of grass) {
      for (let i = 0; i < z.w; i++) {
        const col = z.x + i;
        const end = i === 0 || i === z.w - 1;
        if (!end && isSolid(room.layout[z.y - 1][col])) continue;
        const kind = i === 0 ? 0 : i === z.w - 1 ? 3 : i % 2 === 1 ? 1 : 2;
        const img = scene.add
          .image(col * TILE, z.surface + GRASS.pieceOffsetY, propKey('grass_live'), kind)
          .setOrigin(0)
          .setDepth(DEPTH.tiles + 1);
        grassPieces.push({ img, kind });
      }
    }
  }
  const grassGfx = grassArt ? null : scene.add.graphics().setDepth(DEPTH.tiles + 1);
  const drawGrass = () => {
    if (grassArt) {
      const b = Math.floor(scene.time.now / GRASS.flickerMs) % 2 === 1;
      for (const { img, kind } of grassPieces) img.setFrame((b ? 4 : 0) + kind);
      return;
    }
    const on = Math.floor(scene.time.now / GRASS.flickerMs) % 2 === 0;
    grassGfx.clear();
    for (const z of grass) {
      grassGfx.fillStyle(COLORS.liveGrass, on ? 1 : 0.55).fillRect(z.left, z.surface - 3, z.right - z.left, 3);
      // Zigzag de 1 px, como el charco electrificado de la calle.
      grassGfx.fillStyle(COLORS.puddleZigzag, on ? 1 : 0.4);
      for (let x = 0; x < z.right - z.left; x++) {
        const phase = x % 4;
        grassGfx.fillRect(z.left + x, z.surface - 3 + (phase === 3 ? 1 : phase), 1, 1);
      }
    }
  };
  // Igual que PuddleNetwork.liveUnder: apoyado en el suelo y metido más de edgeMarginPx dentro de la zona.
  const onLiveGrass = (body) =>
    body.blocked.down &&
    grass.some(
      (z) => Math.abs(body.bottom - z.surface) <= 1 && body.right - PUDDLE.edgeMarginPx > z.left && body.left + PUDDLE.edgeMarginPx < z.right,
    );

  // --- Columpio: plataforma móvil sólida solo por arriba que arrastra al jugador ---
  // El asiento es un cuerpo ESTÁTICO de Arcade que se reubica en cada frame: así el jugador parado encima queda
  // con blocked.down (puede saltar como en el suelo). Solo choca su cara de arriba: desde abajo se atraviesa.
  const sw = room.swing;
  const swingAngle = (t) => SWING.amplitudeDeg * DEG * Math.sin((2 * Math.PI * t) / SWING.periodS);
  const seatTopLeft = (a) => ({
    x: Math.round(sw.pivotX + sw.chain * Math.sin(a) - SWING.seatW / 2),
    y: Math.round(sw.pivotY + sw.chain * Math.cos(a)),
  });
  let seatPos = seatTopLeft(swingAngle(0));
  const seat = scene.add.zone(seatPos.x, seatPos.y, SWING.seatW, SWING.seatH).setOrigin(0);
  scene.physics.add.existing(seat, true);
  Object.assign(seat.body.checkCollision, { down: false, left: false, right: false });
  scene.physics.add.collider(player, seat);
  const swingGfx = scene.add.graphics().setDepth(DEPTH.props); // cadena (y asiento greybox)
  // Asiento con arte: swing_seat (24x6, origen 0,0) en la misma posición que la zona física; su borde de
  // arriba es la cara sólida. Se crea después de la cadena (misma profundidad) para quedar encima de ella.
  const seatSprite = hasArt(propKey('swing_seat'))
    ? scene.add.image(seatPos.x, seatPos.y, propKey('swing_seat')).setOrigin(0).setDepth(DEPTH.props)
    : null;
  if (!wallArt) {
    // Marco del columpio (greybox; con arte viene en park_back.png).
    const frameGfx = scene.add.graphics().setDepth(DEPTH.tiles - 1);
    frameGfx.lineStyle(2, COLORS.swingFrame);
    frameGfx.lineBetween(sw.legX1, sw.beamY, sw.legX2, sw.beamY); // travesaño
    frameGfx.lineBetween(sw.legX1, sw.beamY, sw.legX1 - 6, groundY).lineBetween(sw.legX1, sw.beamY, sw.legX1 + 6, groundY);
    frameGfx.lineBetween(sw.legX2, sw.beamY, sw.legX2 - 6, groundY).lineBetween(sw.legX2, sw.beamY, sw.legX2 + 6, groundY);
    frameGfx.lineStyle(1, COLORS.chain).lineBetween(sw.pivotX, sw.beamY, sw.pivotX, sw.pivotY); // gancho
  }
  const updateSwing = () => {
    const next = seatTopLeft(swingAngle(wind.elapsed));
    const dx = next.x - seatPos.x;
    const dy = next.y - seatPos.y;
    // ¿El jugador está parado sobre el asiento (en su posición anterior)? Entonces se mueve con él.
    const b = player.body;
    const riding =
      b.blocked.down && Math.abs(b.bottom - seatPos.y) <= 1 && b.right > seatPos.x && b.left < seatPos.x + SWING.seatW;
    seat.setPosition(next.x, next.y);
    seat.body.updateFromGameObject();
    if (riding) {
      // El body se sincroniza con el GameObject al empezar el próximo paso de física.
      player.x += dx;
      player.y += dy;
    }
    seatPos = next;
    swingGfx.clear();
    // Cadena: 1 px del pivote al centro del borde de arriba del asiento.
    swingGfx.lineStyle(1, COLORS.chain).lineBetween(sw.pivotX, sw.pivotY, next.x + SWING.seatW / 2, next.y);
    if (seatSprite) seatSprite.setPosition(next.x, next.y);
    else swingGfx.fillStyle(COLORS.swingSeat).fillRect(next.x, next.y, SWING.seatW, SWING.seatH);
    return riding;
  };

  // --- Árbol: tronco electrificado y chispas durante la ráfaga ---
  const trunkRect = { left: tree.trunk.x, top: tree.trunk.y, right: tree.trunk.x + tree.trunk.w, bottom: tree.trunk.y + tree.trunk.h };
  // Árbol electrificado con arte: tree_live (anim "buzz"), solo durante la ráfaga. Se usa solo si su frame mide lo
  // que espera la sala (tree.live.w x h); si no (p. ej. un PNG viejo), avisa y usa el tinte greybox del tronco,
  // para no dibujar el overlay en el lugar equivocado.
  const liveKey = propKey('tree_live');
  let treeLive = null;
  if (hasArt(liveKey)) {
    const f = scene.textures.getFrame(liveKey, 0);
    if (f.width === tree.live.w && f.height === tree.live.h) {
      treeLive = scene.add.sprite(tree.live.x, tree.live.y, liveKey, 0).setOrigin(0).setDepth(DEPTH.tiles).setVisible(false);
      if (scene.anims.exists(`${liveKey}-buzz`)) treeLive.play(`${liveKey}-buzz`);
    } else {
      console.warn(`[park] tree_live mide ${f.width}x${f.height} y la sala espera ${tree.live.w}x${tree.live.h}: se usa el tinte greybox del tronco`);
    }
  }
  const trunkGlow = treeLive
    ? null
    : scene.add
        .rectangle(tree.trunk.x, tree.trunk.y, tree.trunk.w, tree.trunk.h, COLORS.liveGrass, 0.8)
        .setOrigin(0)
        .setDepth(DEPTH.tiles)
        .setVisible(false);
  // Chispas y chispazo con arte: tree_spark (6x6, anim "fall", centrado en la chispa) y cp_flash (17x17, anim
  // "flash" una vez, centrado en cada punto de contacto). La hitbox de la chispa sigue siendo de 4x4.
  const sparkKey = propKey('tree_spark');
  const sparkArt = hasArt(sparkKey);
  const flashKey = propKey('cp_flash');
  const flashArt = hasArt(flashKey);
  let sparks = []; // { x, y } esquina superior izquierda, px
  let sparkClock = 0; // s acumulados para la próxima tanda
  let flashMs = 0; // chispazo en los puntos de contacto al empezar la ráfaga
  const sparkGfx = sparkArt ? null : scene.add.graphics().setDepth(DEPTH.props + 1);
  const updateTree = (dt) => {
    const gust = wind.phase === 'gust';
    if (wind.gustStarted) {
      sparkClock = TREE_SPARK.everyS; // la primera tanda sale apenas empieza la ráfaga
      flashMs = TREE_SPARK.flashMs;
      if (flashArt) {
        for (const cp of tree.contacts) {
          const fx = scene.add.sprite(cp.x, cp.y, flashKey, 0).setOrigin(0.5).setDepth(DEPTH.props + 1);
          fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
          fx.play(`${flashKey}-flash`);
        }
      }
    }
    if (gust) {
      sparkClock += dt;
      while (sparkClock >= TREE_SPARK.everyS) {
        sparkClock -= TREE_SPARK.everyS;
        for (const cp of tree.contacts) {
          const jitter = rng.realInRange(-TREE_SPARK.jitterPx, TREE_SPARK.jitterPx);
          const spark = { x: cp.x + jitter - TREE_SPARK.size / 2, y: cp.y };
          if (sparkArt) {
            spark.sprite = scene.add.sprite(0, 0, sparkKey, 0).setOrigin(0.5).setDepth(DEPTH.props + 1);
            spark.sprite.play(`${sparkKey}-fall`);
          }
          sparks.push(spark);
        }
      }
    }
    // Las que ya salieron siguen cayendo aunque termine la ráfaga; desaparecen al tocar el suelo.
    for (const s of sparks) {
      s.x += TREE_SPARK.driftX * dt;
      s.y += TREE_SPARK.fallSpeed * dt;
    }
    sparks = sparks.filter((s) => {
      const alive = s.y + TREE_SPARK.size < groundY;
      if (!alive) s.sprite?.destroy();
      return alive;
    });
    flashMs = Math.max(0, flashMs - dt * 1000);

    if (treeLive) treeLive.setVisible(gust);
    else trunkGlow.setVisible(gust).setAlpha(Math.floor(scene.time.now / 90) % 2 ? 0.8 : 0.5);
    if (sparkArt) {
      // Sprite centrado en la chispa (el centro de su hitbox de 4x4).
      for (const s of sparks) s.sprite.setPosition(Math.round(s.x + TREE_SPARK.size / 2), Math.round(s.y + TREE_SPARK.size / 2));
      return;
    }
    sparkGfx.clear();
    sparkGfx.fillStyle(COLORS.spark);
    for (const s of sparks) sparkGfx.fillRect(Math.round(s.x), Math.round(s.y), TREE_SPARK.size, TREE_SPARK.size);
    if (flashMs > 0 && !flashArt) {
      // Chispazo greybox: cruz de 9 px en cada punto de contacto.
      sparkGfx.fillStyle(0xffffff);
      for (const cp of tree.contacts) sparkGfx.fillRect(cp.x - 4, cp.y - 1, 9, 3).fillRect(cp.x - 1, cp.y - 4, 3, 9);
    }
  };
  const sparkHits = (body) =>
    sparks.some((s) => overlaps(body, { left: s.x, top: s.y, right: s.x + TREE_SPARK.size, bottom: s.y + TREE_SPARK.size }, CABLE.hitMarginPx));

  // --- Hilos de cometa ---
  const strings = room.strings.map((s) => new KiteString(scene, { x: s.x, y: s.y, length: s.length }));

  // --- NPCs ---
  const npcAt = (id, options) => {
    const data = room.npcs.find((n) => n.id === id);
    const pos = tileToFeet(data);
    return new NpcActor(scene, pos.x, pos.y, data.texture, options);
  };
  // Tomás: "worry" (señala la cometa, mirando a la derecha aunque el jugador esté cerca) hasta que le hablen por
  // primera vez; después "idle" (mira al jugador al acercarse) y "talk" al escribir.
  const tomas = npcAt('tomas', {
    ambient: () => (scene.flag('talkedToTomas') ? 'idle' : 'worry'),
    lockedAmbient: 'worry',
    onInteract: () => {
      const hooks = tomas.dialogHooks(player);
      if (scene.flag('talkedToTomas')) say(D.tomas.again, null, hooks);
      else say(D.tomas.first, () => scene.setFlag('talkedToTomas'), hooks);
    },
  });
  // Fin del nivel: diálogo del técnico → cartel de fin → fundido al mercado (nivel 4). El timer se pausa con el
  // cartel y sigue en el mercado (es la misma partida).
  let finished = false;
  const finish = () => {
    finished = true;
    scene.freeze();
    PlayTimer.pause(scene.registry);
    scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.6).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.ui);
    pixelText(scene, GAME_W / 2, GAME_H / 2, D.end, { scale: 2, origin: 0.5, maxWidth: GAME_W - 40, align: 1 })
      .setScrollFactor(0)
      .setDepth(DEPTH.ui + 1);
    scene.time.delayedCall(PARK.endHoldMs, () => {
      const cam = scene.cameras.main;
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        PlayTimer.resume(scene.registry);
        scene.scene.start('Game', { roomId: 'market' });
      });
      cam.fadeOut(PARK.exitFadeMs, 0, 0, 0);
    });
  };
  // Técnico: "radio" mientras el jugador no está en su zona; al entrar lo mira e "idle"; "talk" al escribir.
  const tecnico = npcAt('tecnico', {
    ambient: () => 'radio',
    onInteract: () => say(D.tecnico.talk, finish, tecnico.dialogHooks(player)),
  });

  return {
    interactables: [tomas, tecnico],
    wind,
    strings,
    seat,
    getSparks: () => sparks,
    // Tip de Game Over según la causa (GameScene.die la pasa a GameOver).
    deathTip: (cause) => D.deathTips[cause],
    update(time, delta) {
      const dt = delta / 1000;
      wind.update(delta);
      // Empuje para el próximo update del jugador (solo cuenta en el aire; ver Player.windX).
      player.windX = wind.airPushX;
      windFx.update(delta);
      updateSwing();
      for (const s of strings) s.update(delta);
      updateTree(dt);
      drawGrass();
      tomas.update(player);
      tecnico.update(player);
      if (finished) return;

      // Muerte: hilos (todo su largo), chispas, tronco durante la ráfaga y pasto electrificado.
      const body = player.body;
      if (strings.some((s) => s.hits(body))) scene.die('string');
      else if (sparkHits(body)) scene.die('spark');
      else if (wind.phase === 'gust' && overlaps(body, trunkRect, CABLE.hitMarginPx)) scene.die('tree');
      else if (onLiveGrass(body)) scene.die('grass');
    },
  };
}
