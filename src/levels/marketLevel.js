import * as Phaser from 'phaser';
import { GAME_W, GAME_H, TILE, DEPTH, COLORS, MARKET_POWER, HOOKUP, AWNING, CART, PUDDLE, MARKET } from '../config/constants.js';
import { pixelText } from '../systems/pixelText.js';
import { Interactable } from '../entities/Interactable.js';
import { NpcActor } from '../entities/NpcActor.js';
import { Pulpo } from '../entities/Pulpo.js';
import { segmentHitsRect } from '../entities/Cable.js';
import { MarketPower } from '../systems/MarketPower.js';
import { PuddleNetwork } from '../systems/PuddleNetwork.js';
import { tileToFeet, findGroundY, legendOf } from '../systems/RoomBuilder.js';
import { PlayTimer } from '../systems/PlayTimer.js';
import { marketDialogs as D } from '../data/dialogs/market.js';
import { propKey } from '../data/appliances.js';

// Nivel 4: el mercado.
//
// Peligros (causas de muerte entre paréntesis). Casi todo sigue el reloj del congelador (MarketPower:
// apagado → aviso → prendido); el pulpo tiene su propio ciclo.
//  - Charcos W1, W2a y W2b: matan con el congelador prendido ('puddle').
//  - Enganches pelados H1-H4: segmentos que matan con el congelador prendido ('hookup').
//  - Lata del mostrador ('m'): estar parado encima con el congelador prendido mata ('metal'). La madera, nunca.
//  - El pulpo: chispas en su ráfaga, siempre letales ('pulpo'), hasta que se baja el taco.
// Plataformas: toldos (solo por arriba, rebotan) y la carretilla (cara de arriba sólida, empuja de lado).
//
// Flags (persisten al morir): talkedToVendedor, carmenWarned (el aviso de doña Carmen sale una sola vez) y
// breakerOff (el pulpo queda apagado del todo). Hablar con doña Carmen con el taco abajo termina el nivel.
export function createMarketLevel(scene) {
  const { room, dialog, player } = scene;
  const groundY = findGroundY(room);
  const rng = new Phaser.Math.RandomDataGenerator(['market']); // azar con semilla: pruebas reproducibles
  const power = new MarketPower();
  const { isSolid } = legendOf(room);
  const worldW = room.layout[0].length * TILE;
  // ¿Hay un sólido del layout en el punto (x, y)? Fuera de la sala por los lados cuenta como sólido.
  const isSolidAt = (x, y) => {
    if (x < 0 || x >= worldW) return true;
    if (y < 0) return false;
    const row = room.layout[Math.floor(y / TILE)];
    return !!row && isSolid(row[Math.floor(x / TILE)]);
  };
  const blink = (ms) => Math.floor(scene.time.now / ms) % 2 === 0;

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

  // Arte de la sala (room.art): ¿cargó cada pieza? Sin ella se dibuja el greybox. `art(name)` = key del prop si
  // cargó, o null.
  const hasArt = (key) => scene.textures.exists(key);
  const art = (name) => (hasArt(propKey(name)) ? propKey(name) : null);
  const playIf = (sprite, key, config) => {
    if (scene.anims.exists(key)) sprite.play(config ? { key, ...config } : key, true);
  };

  // --- Fondo (market_back): puestos, poste, manojo, congelador, extensión, columna del taco ---
  // Depth interior: queda detrás de todo lo de la sala (la luz del congelador va en tiles - 1, por encima).
  const wallArt = hasArt(`${room.id}-wall`);
  if (wallArt) scene.add.image(0, 0, `${room.id}-wall`).setOrigin(0).setDepth(DEPTH.interior);

  // --- Decorado greybox (sin arte): manojo de enganches, bajadas decorativas, congelador, extensión con empalme ---
  // Con arte todo esto viene en market_back.png (incluidas las partes con forro de los enganches).
  if (!wallArt) {
    const deco = scene.add.graphics().setDepth(DEPTH.tiles - 1);
    // Manojo de 3 cables sucios desde la punta del poste, con comba entre "amarres" cada 160 px.
    const bundleY = (k, x) => {
      const span = 160;
      const frac = ((x - room.bundle.x1) % span) / span;
      return room.bundle.yMin + k * 3 + Math.sin(Math.PI * frac) * (room.bundle.yMax - room.bundle.yMin - 7);
    };
    deco.lineStyle(1, COLORS.dirtyCable);
    for (let k = 0; k < 3; k++) {
      deco.beginPath();
      deco.moveTo(room.bundle.x1, room.bundle.y1);
      for (let x = room.bundle.x1 + 8; x <= room.bundle.x2; x += 8) deco.lineTo(x, bundleY(k, x));
      deco.strokePath();
    }
    // Enganches que no arrancan en el manojo: un cable sucio (decorativo, no mata) los cuelga de él.
    for (const h of room.hookups) {
      if (h.y1 > room.bundle.yMax + 2) deco.lineBetween(h.x1, bundleY(1, h.x1), h.x1, h.y1);
    }
    // Extensión por el piso cruzando W1, con un empalme de cinta.
    const ext = room.extension;
    deco.lineStyle(2, COLORS.dirtyCable).lineBetween(ext.x1, ext.y, ext.x2, ext.y);
    deco.fillStyle(COLORS.tape).fillRect(ext.tapeX - 3, ext.y - 2, 7, 4);
    // Congelador del pescado.
    const fz = room.freezer;
    deco.fillStyle(COLORS.freezer).fillRect(fz.x * TILE, fz.y * TILE, fz.w * TILE, fz.h * TILE);
    deco.fillStyle(0x9aa3ad).fillRect(fz.x * TILE + 2, fz.y * TILE + 12, fz.w * TILE - 4, 1).fillRect(fz.x * TILE + 26, fz.y * TILE + 20, 2, 8);
  }

  // --- Luz y zumbido del congelador (siguen al reloj del mercado) ---
  // Con arte: freezer_light (0 apagada, 1 roja, 2 roja con brillo) centrada en la luz y freezer_waves (anim 'hum')
  // con su esquina en room.freezer.waves, solo prendido. Depth tiles - 1: encima de market_back, debajo de los tiles.
  const fz = room.freezer;
  const lightKey = art('freezer_light');
  const wavesKey = art('freezer_waves');
  const freezerLight = lightKey && scene.add.image(fz.light.x, fz.light.y, lightKey, 0).setDepth(DEPTH.tiles - 1);
  const freezerWaves = wavesKey && scene.add.sprite(fz.waves.x, fz.waves.y, wavesKey, 0).setOrigin(0).setDepth(DEPTH.tiles - 1).setVisible(false);
  // Greybox de lo que no tenga arte (luz y/o ondas).
  const freezerGfx = lightKey && wavesKey ? null : scene.add.graphics().setDepth(DEPTH.tiles - 1);
  const drawFreezer = () => {
    const on = power.phase === 'on';
    const lit = on || (power.phase === 'warn' && blink(MARKET_POWER.lightBlinkMs));
    if (freezerWaves) {
      freezerWaves.setVisible(on);
      if (on) playIf(freezerWaves, `${wavesKey}-hum`);
      else freezerWaves.stop();
    }
    freezerLight?.setFrame(on ? 2 : lit ? 1 : 0);
    if (!freezerGfx) return;
    const g = freezerGfx;
    const { x, y } = fz.light;
    g.clear();
    if (!freezerLight) g.fillStyle(lit ? COLORS.freezerLight : 0x4a4f57).fillCircle(x, y, 2);
    if (on && !freezerWaves) {
      // Ondas (greybox): dos arcos que se abren hacia los lados y se desvanecen.
      for (let i = 0; i < 2; i++) {
        const k = ((power.elapsed * 1.6 + i / 2) % 1); // 0..1
        g.lineStyle(1, COLORS.hum, 1 - k);
        const r = 6 + k * 14;
        g.beginPath();
        g.arc(x, y + 4, r, -Math.PI / 3, Math.PI / 3);
        g.strokePath();
        g.beginPath();
        g.arc(x, y + 4, r, (2 * Math.PI) / 3, (4 * Math.PI) / 3);
        g.strokePath();
      }
    }
  };

  // --- Charcos (como los de la calle, pero sin red: siguen todos al congelador) ---
  // Con arte: piezas de 16x7 desde y = 207 en depth tiles + 1, igual que en la calle (debajo de los tiles se
  // taparían con el piso).
  const puddles = new PuddleNetwork(scene, {
    puddles: room.puddles,
    artKey: propKey('puddle'),
    stateFn: () => (power.phase === 'on' ? 'live' : power.phase === 'warn' ? 'warn' : 'off'),
  });

  // --- Enganches pelados ---
  // Siempre con Graphics de 2 px (las partes con forro vienen en market_back). Con arte: cobre apagado, alterna
  // cobre / amarillo en el aviso y amarillo prendido, con 2 o 3 sprites hookup_spark fijos repartidos por el tramo.
  const hookupGfx = scene.add.graphics().setDepth(DEPTH.props);
  const hookupColors = wallArt ? { off: HOOKUP.artOff, live: HOOKUP.artLive } : { off: COLORS.hookupOff, live: COLORS.hookupLive };
  const sparkKey = art('hookup_spark');
  const hookupSparks = [];
  if (sparkKey) {
    for (const h of room.hookups) {
      const n = Math.hypot(h.x2 - h.x1, h.y2 - h.y1) >= HOOKUP.sparkLongPx ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const k = (i + 0.5) / n; // centros de n tramos iguales
        const spark = scene.add
          .sprite(Math.round(h.x1 + (h.x2 - h.x1) * k), Math.round(h.y1 + (h.y2 - h.y1) * k), sparkKey, 0)
          .setDepth(DEPTH.props)
          .setVisible(false);
        spark.startFrame = hookupSparks.length % 4; // desfasadas para que no chisporroteen al unísono
        hookupSparks.push(spark);
      }
    }
  }
  const drawHookups = () => {
    const g = hookupGfx;
    g.clear();
    const on = power.phase === 'on';
    const live = on || (power.phase === 'warn' && blink(HOOKUP.blinkMs));
    g.lineStyle(HOOKUP.thicknessPx, live ? hookupColors.live : hookupColors.off);
    for (const h of room.hookups) g.lineBetween(h.x1, h.y1, h.x2, h.y2);
    for (const sp of hookupSparks) {
      if (on && !sp.visible) playIf(sp, `${sparkKey}-crackle`, { startFrame: sp.startFrame });
      sp.setVisible(on);
    }
    if (on && !sparkKey) {
      // Chispitas: puntos al azar a lo largo de cada tramo.
      g.fillStyle(COLORS.spark);
      for (const h of room.hookups) {
        for (let i = 0; i < 2; i++) {
          const k = Math.random();
          g.fillRect(Math.round(h.x1 + (h.x2 - h.x1) * k + (Math.random() * 6 - 3)), Math.round(h.y1 + (h.y2 - h.y1) * k + (Math.random() * 6 - 3)), 1, 1);
        }
      }
    }
  };
  const hookupHits = (b) => {
    const m = HOOKUP.hitMarginPx - HOOKUP.thicknessPx / 2;
    const r = { left: b.left + m, right: b.right - m, top: b.top + m, bottom: b.bottom - m };
    return room.hookups.some((h) => segmentHitsRect(h.x1, h.y1, h.x2, h.y2, r));
  };

  // --- Lata del mostrador: tramos 'm' de la fila de arriba del mostrador ---
  const metalRuns = []; // { left, right, top } px
  room.layout.forEach((row, r) => {
    for (const run of row.matchAll(/m+/g)) {
      const above = room.layout[r - 1] ?? '';
      // Solo la cara de arriba de cada tramo (donde se para el jugador).
      if (above[run.index] !== 'm') metalRuns.push({ left: run.index * TILE, right: (run.index + run[0].length) * TILE, top: r * TILE });
    }
  });
  // Con arte: un sprite metal_live (anim 'buzz') encima de cada tile 'm' (las dos filas del mostrador), solo prendido.
  const metalKey = art('metal_live');
  const metalLive = [];
  if (metalKey) {
    room.layout.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        if (ch !== 'm') return;
        const sp = scene.add.sprite(c * TILE, r * TILE, metalKey, 0).setOrigin(0).setDepth(DEPTH.tiles + 1).setVisible(false);
        metalLive.push(sp);
      });
    });
  }
  const metalGfx = scene.add.graphics().setDepth(DEPTH.tiles + 1);
  const drawMetal = () => {
    if (metalKey) {
      const on = power.phase === 'on';
      for (const sp of metalLive) {
        if (on && !sp.visible) playIf(sp, `${metalKey}-buzz`);
        sp.setVisible(on);
      }
      return;
    }
    metalGfx.clear();
    if (power.phase !== 'on' || !blink(HOOKUP.blinkMs)) return;
    metalGfx.fillStyle(COLORS.hookupLive);
    for (const m of metalRuns) {
      metalGfx.fillRect(m.left, m.top, m.right - m.left, 1);
      metalGfx.fillRect(m.left, m.top, 1, 6).fillRect(m.right - 1, m.top, 1, 6);
    }
  };
  // Parado sobre la lata: apoyado en su cara de arriba y con más de edgeMarginPx del hitbox encima.
  const onMetal = (b) =>
    b.blocked.down &&
    metalRuns.some((m) => Math.abs(b.bottom - m.top) <= 1 && b.right - PUDDLE.edgeMarginPx > m.left && b.left + PUDDLE.edgeMarginPx < m.right);

  // --- Toldos: sólidos solo por arriba; al caer encima, el jugador rebota ---
  // Cada toldo es un cuerpo estático de Arcade con solo la cara de arriba (como el asiento del columpio): así el
  // jugador queda apoyado (blocked.down) y en ese mismo frame el script le da la velocidad del rebote.
  const awnings = room.awnings.map((a) => {
    const zone = scene.add.zone(a.x, a.y, a.w, 5).setOrigin(0);
    scene.physics.add.existing(zone, true);
    Object.assign(zone.body.checkCollision, { down: false, left: false, right: false });
    scene.physics.add.collider(player, zone);
    return { ...a, zone, sagUntil: -Infinity };
  });
  // Con arte: piezas de 16x12 (awning: frames 0-3 toldo 1, 4-7 toldo 2; izquierda, medio a, medio b, derecha) con
  // el borde de arriba en la cara sólida. Al rebotar se bajan sagPx durante sagMs.
  const awningKey = art('awning');
  if (awningKey) {
    awnings.forEach((a, i) => {
      const base = (i % 2) * 4;
      const n = a.w / TILE;
      a.pieces = [];
      for (let k = 0; k < n; k++) {
        const kind = k === 0 ? 0 : k === n - 1 ? 3 : k % 2 === 1 ? 1 : 2;
        a.pieces.push(scene.add.image(a.x + k * TILE, a.y, awningKey, base + kind).setOrigin(0).setDepth(DEPTH.props));
      }
    });
  }
  const awningGfx = awningKey ? null : scene.add.graphics().setDepth(DEPTH.props);
  const drawAwnings = (time) => {
    if (awningKey) {
      for (const a of awnings) {
        const y = a.y + (time < a.sagUntil ? AWNING.sagPx : 0);
        for (const p of a.pieces) p.y = y;
      }
      return;
    }
    awningGfx.clear();
    for (const a of awnings) {
      const y = a.y + (time < a.sagUntil ? AWNING.sagPx : 0);
      // Lona de 5 px a rayas de 8 px.
      for (let x = 0; x < a.w; x += 8) {
        awningGfx.fillStyle(Math.floor(x / 8) % 2 ? COLORS.awningStripe : COLORS.awning).fillRect(a.x + x, y, Math.min(8, a.w - x), 5);
      }
    }
  };
  const bounce = (time) => {
    const b = player.body;
    if (!b.blocked.down) return;
    for (const a of awnings) {
      if (Math.abs(b.bottom - a.y) <= 1 && b.right > a.x && b.left < a.x + a.w) {
        // Rebote automático. Se anulan el coyote time y el salto en búfer, y se marca el salto como ya
        // "recortado": así ni un salto normal ni soltar el botón le quitan fuerza al rebote.
        b.setVelocityY(AWNING.bounceVy);
        player.lastGroundedAt = -Infinity;
        player.jumpPressedAt = -Infinity;
        player.jumpCutDone = true;
        // La animación se elige en Player.update, que ya corrió este frame con el jugador "apoyado" (idle): se
        // vuelve a elegir con la velocidad nueva para que el rebote no muestre ni un frame de idle.
        player.updateAnimation(false);
        a.sagUntil = time + AWNING.sagMs;
        return;
      }
    }
  };

  // --- Carretilla: va y viene; cara de arriba sólida (lleva al que está encima) y empuja de lado ---
  const cartTop = groundY - CART.h;
  const cart = { x: room.cart.minX, dir: 1 };
  const cartZone = scene.add.zone(cart.x, cartTop, CART.w, CART.h).setOrigin(0);
  scene.physics.add.existing(cartZone, true);
  Object.assign(cartZone.body.checkCollision, { down: false, left: false, right: false });
  scene.physics.add.collider(player, cartZone);
  // Con arte: sprite cart (32x16) en el rect del cuerpo, anim 'roll' mientras se mueve y flipX según la dirección.
  const cartKey = art('cart');
  const cartSprite = cartKey && scene.add.sprite(cart.x, cartTop, cartKey, 0).setOrigin(0).setDepth(DEPTH.props);
  const cartGfx = cartKey ? null : scene.add.graphics().setDepth(DEPTH.props);
  const updateCart = (time, dt) => {
    const b = player.body;
    // ¿Va encima? (con la posición de antes de moverla, como el columpio)
    const riding = b.blocked.down && Math.abs(b.bottom - cartTop) <= 1 && b.right > cart.x && b.left < cart.x + CART.w;
    let nx = cart.x + cart.dir * CART.speed * dt;
    if (nx > room.cart.maxX - CART.w) {
      nx = room.cart.maxX - CART.w;
      cart.dir = -1;
    } else if (nx < room.cart.minX) {
      nx = room.cart.minX;
      cart.dir = 1;
    }
    // De lado: el jugador está a la altura de la caja (no encima) y la caja (ya movida) se le mete.
    const beside = !riding && b.bottom > cartTop + 1 && b.top < groundY;
    if (beside && b.right > nx && b.left < nx + CART.w) {
      const side = b.center.x < nx + CART.w / 2 ? -1 : 1; // el jugador está a la izquierda (-1) o derecha (+1)
      if (side === cart.dir) {
        // La carretilla va hacia él: lo empuja. Si está contra un sólido, la carretilla se detiene (no lo atraviesa).
        if (side === 1 ? b.blocked.right : b.blocked.left) nx = cart.x;
        player.push(side * (CART.speed + CART.pushExtra), time + CART.pushMs);
      } else if (Math.sign(b.velocity.x) === -side) {
        b.setVelocityX(0); // caminó contra la parte de atrás: solo lo frena
      }
      // En ambos casos queda pegado a la cara de la carretilla, por fuera.
      const targetLeft = side === 1 ? nx + CART.w : nx - b.width;
      player.x += targetLeft - b.left;
    }
    const dx = nx - cart.x;
    cart.x = nx;
    cartZone.setPosition(Math.round(cart.x), cartTop);
    cartZone.body.updateFromGameObject();
    if (riding) player.x += dx;
    const x = Math.round(cart.x);
    if (cartSprite) {
      cartSprite.setPosition(x, cartTop).setFlipX(cart.dir < 0);
      if (dx === 0) cartSprite.anims.pause(); // detenida contra el jugador: las ruedas no giran
      else if (cartSprite.anims.isPaused) cartSprite.anims.resume();
      else playIf(cartSprite, `${cartKey}-roll`);
      return;
    }
    // Greybox: caja café con dos ruedas.
    cartGfx.clear();
    cartGfx.fillStyle(COLORS.cart).fillRect(x, cartTop, CART.w, CART.h - 4);
    cartGfx.fillStyle(0x6b4423).fillRect(x, cartTop, CART.w, 1).fillRect(x + 15, cartTop + 1, 2, CART.h - 5);
    cartGfx.fillStyle(COLORS.wheel).fillCircle(x + 7, groundY - 3, 3).fillCircle(x + CART.w - 7, groundY - 3, 3);
  };

  // --- El pulpo y el taco ---
  const pulpo = new Pulpo(scene, {
    x: room.pulpo.x,
    y: room.pulpo.y,
    isSolidAt,
    rng,
    art: { key: art('pulpo'), sparkKey: art('pulpo_spark') },
  });
  // Taco: con arte, spritesheet breaker (frame 0 prendido, 1 apagado) en el rect de room.breaker; si no, las dos
  // texturas del greybox.
  const br = room.breaker;
  const breakerKey = art('breaker');
  const setBreaker = (off) => (breakerKey ? breaker.setFrame(off ? 1 : 0) : breaker.setTexture(off ? 'breaker-off' : 'breaker-on'));
  const breaker = new Interactable(scene, br.x + br.w / 2, br.y + br.h, breakerKey ?? 'breaker-on', {
    frame: breakerKey ? 0 : undefined,
    standY: br.standY,
    canInteract: () => !scene.flag('breakerOff'),
    onInteract: () => {
      scene.setFlag('breakerOff');
      setBreaker(true);
      pulpo.turnOff(false);
    },
  });
  if (scene.flag('breakerOff')) {
    setBreaker(true);
    pulpo.turnOff(true);
  }

  // --- NPCs ---
  const npcAt = (id, options) => {
    const data = room.npcs.find((n) => n.id === id);
    const pos = tileToFeet(data);
    // Sin el spritesheet, el placeholder de PreloadScene (npc-<id>).
    const texture = hasArt(data.texture) ? data.texture : `npc-${id}`;
    return new NpcActor(scene, pos.x, pos.y, texture, options);
  };
  // Vendedor: señala los cables ('point') mientras el jugador está en su zona y todavía no le ha hablado.
  const vendedor = npcAt('vendedor', {
    noticed: () => (scene.flag('talkedToVendedor') ? 'idle' : 'point'),
    onInteract: () => {
      const hooks = vendedor.dialogHooks(player);
      if (scene.flag('talkedToVendedor')) say(D.vendedor.again, null, hooks);
      else say(D.vendedor.first, () => scene.setFlag('talkedToVendedor'), hooks);
    },
  });
  // Fin del nivel: diálogo de doña Carmen (con el taco abajo) → cartel de fin → fundido a la obra (nivel 5). El
  // timer se pausa con el cartel y sigue en la obra (es la misma partida), como del parque al mercado.
  let finished = false;
  const finish = () => {
    finished = true;
    scene.freeze();
    PlayTimer.pause(scene.registry);
    scene.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.6).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.ui);
    pixelText(scene, GAME_W / 2, GAME_H / 2, D.end, { scale: 2, origin: 0.5, maxWidth: GAME_W - 40, align: 1 })
      .setScrollFactor(0)
      .setDepth(DEPTH.ui + 1);
    scene.time.delayedCall(MARKET.endHoldMs, () => {
      const cam = scene.cameras.main;
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        PlayTimer.resume(scene.registry);
        scene.scene.start('Game', { roomId: 'construction' });
      });
      cam.fadeOut(MARKET.exitFadeMs, 0, 0, 0);
    });
  };
  // Doña Carmen: manos arriba ('alarm') mientras el taco esté prendido, cerca o lejos; con el taco abajo, 'idle'.
  const carmenAnim = () => (scene.flag('breakerOff') ? 'idle' : 'alarm');
  const carmen = npcAt('carmen', {
    ambient: carmenAnim,
    noticed: carmenAnim,
    onInteract: () => {
      const hooks = carmen.dialogHooks(player);
      if (scene.flag('breakerOff')) say(D.carmen.done, finish, hooks);
      else say(D.carmen.warn, () => scene.setFlag('carmenWarned'), hooks);
    },
  });

  return {
    interactables: [vendedor, breaker, carmen],
    power,
    pulpo,
    cart,
    // Tip de Game Over según la causa (GameScene.die la pasa a GameOver).
    deathTip: (cause) => D.deathTips[cause],
    update(time, delta) {
      const dt = delta / 1000;
      power.update(delta);
      puddles.update(power.elapsed);
      bounce(time);
      updateCart(time, dt);
      pulpo.update(delta);
      drawFreezer();
      drawHookups();
      drawMetal();
      drawAwnings(time);
      vendedor.update(player);
      carmen.update(player);
      if (finished) return;

      // Aviso de doña Carmen: una sola vez (el flag sobrevive a la muerte).
      if (!scene.flag('carmenWarned') && player.x > room.carmenWarnX && !dialog.isOpen) {
        scene.setFlag('carmenWarned');
        say(D.carmen.warn, null, carmen.dialogHooks(player));
      }

      // Muerte: enganches y lata con el congelador prendido, chispas del pulpo siempre, charcos prendidos.
      const b = player.body;
      if (power.on && hookupHits(b)) scene.die('hookup');
      else if (pulpo.hits(b, HOOKUP.hitMarginPx)) scene.die('pulpo');
      else if (power.on && onMetal(b)) scene.die('metal');
      else if (puddles.liveUnder(b)) scene.die('puddle');
    },
  };
}
