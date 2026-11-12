import * as Phaser from 'phaser';
import {
  TILE,
  DEPTH,
  COLORS,
  POWER_LINE,
  MIXER,
  SCAFFOLD_ARC,
  CRANE,
  BEAM_WAVE,
  PUDDLE,
} from '../config/constants.js';
import { NpcActor } from '../entities/NpcActor.js';
import { segmentHitsRect } from '../entities/Cable.js';
import { PhaseClock } from '../systems/PhaseClock.js';
import { tileToFeet, findGroundY } from '../systems/RoomBuilder.js';
import { goToResults } from '../systems/startGame.js';
import { constructionDialogs as D } from '../data/dialogs/construction.js';
import { propKey } from '../data/appliances.js';

// Nivel 5: la obra. El más difícil: ventanas cortas, pero todo avisa antes.
//
// Peligros (causa de muerte entre paréntesis). Cada uno con su propio reloj, que avanza con el delta del update:
//  - Línea de alta tensión: segmento de lado a lado, siempre letal ('line'). Ningún salto la alcanza.
//  - Concreto fresco C1/C2: mata con la mezcladora girando, como los charcos ('concrete').
//  - Arcos del andamio: recorren los tramos del tablón de arriba de ida y vuelta ('arc').
//  - Grúa: la carga de varillas y el cable del gancho ('crane').
//  - Onda de la viga: franja que recorre la cara de arriba de la viga; mata solo apoyado en la viga ('beam').
// Plataformas: tablones del andamio ('T'), sólidos solo por arriba (se atraviesan desde abajo y de lado).
// Flags (persisten al morir): talkedToMaestro, talkedToIngeniera.
//
// Arte (room.art, como el mercado): construction_back (depth interior) trae postes, aisladores, la línea, parales y
// crucetas del andamio, pluma, torre y mezcladora quieta; construction_tiles (RoomBuilder) trae sólidos y tablones.
// Los props de assets/props/construction/ (posiciones en su README) reemplazan cada pieza del greybox si cargaron;
// si una textura falta, esa pieza vuelve al greybox. El arte NO cambia colisiones ni zonas letales.
export function createConstructionLevel(scene) {
  const { room, dialog, player } = scene;
  const groundY = findGroundY(room);
  const rng = new Phaser.Math.RandomDataGenerator(['construction']); // azar con semilla (chispas de la pluma)
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

  // ¿Cargó cada pieza de arte? `art(name)` = key del prop si cargó, o null (greybox).
  const hasArt = (key) => scene.textures.exists(key);
  const art = (name) => (hasArt(propKey(name)) ? propKey(name) : null);
  const playIf = (sprite, key) => {
    if (scene.anims.exists(key)) sprite.play(key, true);
  };

  // ¿El hitbox, recortado `m` px por lado, toca el segmento? (rozar no mata, como los enganches del mercado)
  const shrink = (b, m) => ({ left: b.left + m, right: b.right - m, top: b.top + m, bottom: b.bottom - m });
  const rectsOverlap = (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
  // Apoyado en la superficie y = top y metido más de `margin` px en [x1, x2].
  const standingIn = (b, top, x1, x2, margin) =>
    b.blocked.down && Math.abs(b.bottom - top) <= 1 && b.right - margin > x1 && b.left + margin < x2;

  // --- Fondo de la sala (construction_back): postes, línea, andamio, pluma, torre, mezcladora quieta ---
  const wallArt = hasArt(`${room.id}-wall`);
  if (wallArt) scene.add.image(0, 0, `${room.id}-wall`).setOrigin(0).setDepth(DEPTH.interior);

  // --- Línea de alta tensión: siempre letal (con arte viene dibujada en el back; la zona letal no cambia) ---
  const line = room.powerLine;
  if (!wallArt) {
    const lineGfx = scene.add.graphics().setDepth(DEPTH.props);
    lineGfx.fillStyle(COLORS.hvLine).fillRect(line.x1, line.y - POWER_LINE.thicknessPx / 2, line.x2 - line.x1, POWER_LINE.thicknessPx);
    // Aisladores en la punta de los postes (columnas con 'P' en la fila 0).
    [...room.layout[0]].forEach((ch, c) => {
      if (ch !== 'P') return;
      const x = c * TILE + TILE / 2;
      lineGfx.fillStyle(COLORS.insulator).fillRect(x - 2, line.y - 4, 4, 3).fillRect(x - 3, line.y + 1, 6, 2);
    });
  }
  const lineHits = (b) => {
    const m = POWER_LINE.hitMarginPx - POWER_LINE.thicknessPx / 2;
    return segmentHitsRect(line.x1, line.y, line.x2, line.y, shrink(b, m));
  };

  // --- Tablones del andamio: sólidos solo por arriba ---
  // Un cuerpo estático por tramo de 'T' con solo la cara de arriba (como los toldos, pero sin rebote).
  room.layout.forEach((row, r) => {
    for (const run of row.matchAll(/T+/g)) {
      const zone = scene.add.zone(run.index * TILE, r * TILE, run[0].length * TILE, 6).setOrigin(0);
      scene.physics.add.existing(zone, true);
      Object.assign(zone.body.checkCollision, { down: false, left: false, right: false });
      scene.physics.add.collider(player, zone);
    }
  });
  // Parales del andamio (greybox; con arte vienen en el back).
  if (!wallArt) {
    const scaffold = scene.add.graphics().setDepth(DEPTH.tiles - 2);
    scaffold.fillStyle(0x8f969e);
    for (const seg of room.arcs.segments) scaffold.fillRect(seg.x1, room.arcs.bottom, 2, groundY - room.arcs.bottom);
    const lastSeg = room.arcs.segments[room.arcs.segments.length - 1];
    scaffold.fillRect(lastSeg.x2 - 2, room.arcs.bottom, 2, groundY - room.arcs.bottom);
  }

  // --- Mezcladora y concreto fresco ---
  const mixer = new PhaseClock([
    ['off', MIXER.offS],
    ['warn', MIXER.warnS],
    ['on', MIXER.onS],
  ]);
  const ma = room.mixer.art;
  // Con arte: sprite mixer (idle / shake / spin) con su esquina en ma.x, ma.y, y la chispa de la punta pelada
  // (spark 'crackle') solo girando.
  const mixerKey = art('mixer');
  const mixerSprite = mixerKey && scene.add.sprite(ma.x, ma.y, mixerKey, 0).setOrigin(0).setDepth(DEPTH.props);
  const sparkKey = art('spark');
  const tipSpark = sparkKey && scene.add.sprite(ma.spark.x, ma.spark.y, sparkKey, 0).setDepth(DEPTH.props + 1).setVisible(false);
  const mixerGfx = mixerKey ? null : scene.add.graphics().setDepth(DEPTH.props);
  const mx = room.mixer.x * TILE + (room.mixer.w * TILE) / 2; // centro de la mezcladora (greybox)
  const drawMixer = () => {
    const on = mixer.phase === 'on';
    if (tipSpark) {
      if (on && !tipSpark.visible) playIf(tipSpark, `${sparkKey}-crackle`);
      tipSpark.setVisible(on);
    }
    if (mixerSprite) {
      playIf(mixerSprite, `${mixerKey}-${on ? 'spin' : mixer.phase === 'warn' ? 'shake' : 'idle'}`);
      return;
    }
    const g = mixerGfx;
    g.clear();
    const shake = mixer.phase === 'warn' ? (blink(40) ? MIXER.shakePx : -MIXER.shakePx) : 0;
    const cx = mx + shake;
    const cy = groundY - 16;
    // Patas y base.
    g.fillStyle(0x4c4f55).fillRect(cx - 12, groundY - 6, 3, 6).fillRect(cx + 9, groundY - 6, 3, 6).fillRect(cx - 13, groundY - 7, 26, 2);
    // Tambor: círculo con dos franjas que giran (solo girando).
    g.fillStyle(COLORS.mixer).fillCircle(cx, cy, 10);
    const angle = on ? mixer.since * MIXER.spinRps * Math.PI * 2 : 0;
    g.lineStyle(2, 0x8a4f16);
    for (const k of [0, Math.PI / 2]) {
      const a = angle + k;
      g.lineBetween(cx - Math.cos(a) * 9, cy - Math.sin(a) * 9, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
    }
    // Cable roto hasta C2: la punta pelada chispea girando (con arte, el cable viene en el sprite).
    const c = room.mixer.cable;
    g.lineStyle(1, COLORS.dirtyCable).lineBetween(c.x1 + shake, c.y1, c.x2, c.y2);
    if (on && !tipSpark) {
      g.fillStyle(COLORS.spark);
      for (let i = 0; i < 3; i++) g.fillRect(c.x2 + Math.round(Math.random() * 6 - 3), c.y2 - Math.round(Math.random() * 5), 1, 1);
    }
  };

  // Concreto: con arte, piezas de 16x6 (izquierda, medio a, medio b, derecha) con la esquina en y = room.concreteArtY.
  // Fila 0 mojado; aviso alternando las filas 1-2; vivo alternando 3-4 (frame = fila · 4 + pieza).
  const concreteKey = art('concrete');
  const concretePieces = [];
  if (concreteKey) {
    for (const cc of room.concrete) {
      const n = (cc.x2 - cc.x1) / TILE;
      for (let i = 0; i < n; i++) {
        const piece = i === 0 ? 0 : i === n - 1 ? 3 : i % 2 === 1 ? 1 : 2;
        const img = scene.add.image(cc.x1 + i * TILE, room.concreteArtY, concreteKey, piece).setOrigin(0).setDepth(DEPTH.tiles + 1);
        concretePieces.push({ img, piece });
      }
    }
  }
  const concreteGfx = concreteKey ? null : scene.add.graphics().setDepth(DEPTH.tiles + 1);
  const drawConcrete = () => {
    if (concreteKey) {
      const row =
        mixer.phase === 'on' ? (blink(PUDDLE.liveFlickerMs) ? 3 : 4) : mixer.phase === 'warn' ? (blink(MIXER.blinkMs) ? 1 : 2) : 0;
      for (const { img, piece } of concretePieces) img.setFrame(row * 4 + piece);
      return;
    }
    const g = concreteGfx;
    g.clear();
    for (const cc of room.concrete) {
      const w = cc.x2 - cc.x1;
      const top = groundY - 3;
      if (mixer.phase === 'on') {
        g.fillStyle(COLORS.liveConcrete).fillRect(cc.x1, top, w, 3);
        g.fillStyle(COLORS.puddleZigzag);
        for (let x = 0; x < w; x++) {
          const p = x % 4;
          g.fillRect(cc.x1 + x, top + (p === 3 ? 1 : p === 2 ? 2 : p), 1, 1);
        }
      } else {
        g.fillStyle(COLORS.wetConcrete).fillRect(cc.x1, top, w, 3);
        if (mixer.phase === 'warn' && blink(MIXER.blinkMs)) {
          g.fillStyle(COLORS.liveConcrete);
          for (let x = 2; x < w; x += 6) g.fillRect(cc.x1 + x, top + (x % 2), 2, 1);
        }
      }
    }
  };
  const concreteHits = (b) =>
    mixer.phase === 'on' && room.concrete.some((cc) => standingIn(b, groundY, cc.x1, cc.x2, MIXER.edgeMarginPx));

  // --- Arcos del andamio ---
  // Secuencia de ida y vuelta: con n tramos, el paso k toca el tramo i = k mod (2n - 2), reflejado si i ≥ n
  // (S1 S2 S3 S4 S3 S2 | S1 S2 ...). Cada paso: aviso warnS y arco arcS.
  const segs = room.arcs.segments;
  const arcStepS = SCAFFOLD_ARC.warnS + SCAFFOLD_ARC.arcS;
  const arcLoop = 2 * segs.length - 2;
  const arcAt = (t) => {
    const k = Math.floor(t / arcStepS);
    const i = k % arcLoop;
    const seg = segs[i < segs.length ? i : arcLoop - i];
    const since = t - k * arcStepS;
    return { seg, phase: since < SCAFFOLD_ARC.warnS ? 'warn' : 'arc', since };
  };
  const arcs = { elapsed: 0, seg: segs[0], phase: 'warn', arcAt };
  // Con arte: plank_fx sobre cada 16 px del tramo de turno (warn en el aviso, lit con el arco), line_spark centrado
  // en la línea durante el aviso y el arco ('strike') del tablón a la línea. Se reubican al cambiar de tramo.
  const ra = room.arcs.art;
  const plankKey = art('plank_fx');
  const lineSparkKey = art('line_spark');
  const arcKey = art('arc');
  const maxPieces = Math.max(...segs.map((s) => (s.x2 - s.x1) / TILE));
  const plankFx = plankKey
    ? Array.from({ length: maxPieces }, () => scene.add.sprite(0, ra.plankY, plankKey, 0).setOrigin(0).setDepth(DEPTH.props).setVisible(false))
    : [];
  const lineSpark = lineSparkKey && scene.add.sprite(0, line.y, lineSparkKey, 0).setDepth(DEPTH.props).setVisible(false);
  const arcSprite = arcKey && scene.add.sprite(0, ra.arcY, arcKey, 0).setOrigin(0.5, 0).setDepth(DEPTH.props).setVisible(false);
  const arcGfx = plankKey && lineSparkKey && arcKey ? null : scene.add.graphics().setDepth(DEPTH.props);
  const drawArc = () => {
    const { seg, phase } = arcs;
    const warn = phase === 'warn';
    const cx = (seg.x1 + seg.x2) / 2;
    const n = (seg.x2 - seg.x1) / TILE;
    plankFx.forEach((sp, i) => {
      const on = i < n;
      sp.setVisible(on);
      if (!on) return;
      sp.x = seg.x1 + i * TILE;
      playIf(sp, `${plankKey}-${warn ? 'warn' : 'lit'}`);
    });
    if (lineSpark) {
      lineSpark.setPosition(cx, line.y).setVisible(warn);
      if (warn) playIf(lineSpark, `${lineSparkKey}-crackle`);
    }
    if (arcSprite) {
      arcSprite.x = cx;
      if (!warn && !arcSprite.visible) playIf(arcSprite, `${arcKey}-strike`);
      arcSprite.setVisible(!warn);
    }
    if (!arcGfx) return;
    // Greybox de lo que no tenga arte.
    const g = arcGfx;
    g.clear();
    const top = room.arcs.top;
    const bottom = room.arcs.bottom;
    const w = seg.x2 - seg.x1;
    if (warn) {
      // El tramo brilla (titila) y la línea encima chisporrotea.
      if (!plankKey && blink(SCAFFOLD_ARC.blinkMs)) g.fillStyle(COLORS.arcGlow, 0.8).fillRect(seg.x1, bottom - 2, w, 2);
      if (!lineSpark) {
        g.fillStyle(COLORS.spark);
        for (let i = 0; i < 5; i++) g.fillRect(seg.x1 + Math.floor(Math.random() * w), top - 3 + Math.floor(Math.random() * 7), 1, 1);
      }
      return;
    }
    if (!plankKey) g.fillStyle(COLORS.arc).fillRect(seg.x1, bottom - 2, w, 2);
    if (arcSprite) return;
    // Arco: zigzag de la línea al tablón por el centro del tramo, con halo.
    g.fillStyle(COLORS.arcGlow, 0.25).fillRect(seg.x1, top, w, bottom - top);
    const pts = [];
    for (let y = top; y < bottom; y += 10) pts.push([cx + (y === top ? 0 : Math.random() * (w * 0.6) - w * 0.3), y]);
    pts.push([cx + Math.random() * 8 - 4, bottom]);
    for (const [width, color] of [[4, COLORS.arcGlow], [2, COLORS.arc]]) {
      g.lineStyle(width, color);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const [x, y] of pts.slice(1)) g.lineTo(x, y);
      g.strokePath();
    }
  };
  const arcRect = () => ({ left: arcs.seg.x1, right: arcs.seg.x2, top: room.arcs.top, bottom: room.arcs.bottom });
  const arcHits = (b) => arcs.phase === 'arc' && rectsOverlap(b, arcRect());

  // --- Grúa ---
  const cr = room.crane;
  const loadClock = new PhaseClock([
    ['up', CRANE.upS],
    ['lowering', CRANE.lowerS],
    ['down', CRANE.downS],
    ['raising', CRANE.raiseS],
  ]);
  const trolleyRange = cr.trolleyMaxX - cr.trolleyMinX;
  // Posición del carro en el instante t: onda triangular entre el mínimo y el máximo (empieza en el mínimo
  // hacia la derecha).
  const trolleyAt = (t) => {
    const u = (t * CRANE.trolleySpeed) % (2 * trolleyRange);
    return cr.trolleyMinX + (u < trolleyRange ? u : 2 * trolleyRange - u);
  };
  const loadTopAt = ({ phase, progress }) => {
    const span = cr.loadDownTop - cr.loadUpTop;
    if (phase === 'up') return cr.loadUpTop;
    if (phase === 'down') return cr.loadDownTop;
    return phase === 'lowering' ? cr.loadUpTop + span * progress : cr.loadDownTop - span * progress;
  };
  const crane = { elapsed: 0, x: cr.trolleyMinX, loadTop: cr.loadUpTop, clock: loadClock, trolleyAt, loadTopAt };
  const loadRect = () => ({
    left: crane.x - CRANE.loadW / 2,
    right: crane.x + CRANE.loadW / 2,
    top: crane.loadTop,
    bottom: crane.loadTop + CRANE.loadH,
  });
  // Pluma y torre (greybox; con arte vienen en el back).
  const by = cr.boom.y;
  if (!wallArt) {
    const craneDeco = scene.add.graphics().setDepth(DEPTH.tiles - 2);
    craneDeco.lineStyle(1, COLORS.crane);
    craneDeco.lineBetween(cr.boom.x1, by - 3, cr.boom.x2, by - 3).lineBetween(cr.boom.x1, by + 3, cr.boom.x2, by + 3);
    for (let x = cr.boom.x1; x < cr.boom.x2; x += 8) craneDeco.lineBetween(x, by + 3, x + 4, by - 3).lineBetween(x + 4, by - 3, x + 8, by + 3);
    const tw = cr.tower;
    craneDeco.lineBetween(tw.x, by, tw.x, tw.bottom).lineBetween(tw.x + tw.w, by, tw.x + tw.w, tw.bottom);
    for (let y = by; y < tw.bottom; y += 12) craneDeco.lineBetween(tw.x, y, tw.x + tw.w, y + 12).lineBetween(tw.x, y + 12, tw.x + tw.w, y + 12);
  }
  // Con arte: cable de 1 px (Graphics), carga 'load' (buzz) con su esquina 22 px a la izquierda y 2 arriba del rect
  // que mata, y el carro 'trolley' (roll) encima del cable. La chispa decorativa es 'boom_spark' (zap, una vez) fija
  // en la punta de la grúa pegada a la línea.
  const ca = cr.art;
  const loadKey = art('load');
  const trolleyKey = art('trolley');
  const boomSparkKey = art('boom_spark');
  const cableGfx = scene.add.graphics().setDepth(DEPTH.props);
  const loadSprite = loadKey && scene.add.sprite(0, 0, loadKey, 0).setOrigin(0).setDepth(DEPTH.props);
  if (loadSprite) playIf(loadSprite, `${loadKey}-buzz`);
  const trolleySprite = trolleyKey && scene.add.sprite(0, ca.trolleyY, trolleyKey, 0).setOrigin(0).setDepth(DEPTH.props + 1);
  if (trolleySprite) playIf(trolleySprite, `${trolleyKey}-roll`);
  const boomSprite = boomSparkKey && scene.add.sprite(ca.boomSpark.x, ca.boomSpark.y, boomSparkKey, 0).setOrigin(0).setDepth(DEPTH.props).setVisible(false);
  boomSprite?.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => boomSprite.setVisible(false));
  // Chispas decorativas entre la pluma y la línea, cada tanto.
  let nextBoomSpark = rng.realInRange(CRANE.boomSparkMinS, CRANE.boomSparkMaxS);
  let boomSpark = null; // greybox: { x, until }
  const craneGfx = scene.add.graphics().setDepth(DEPTH.props);
  const drawCrane = () => {
    const x = Math.round(crane.x);
    const r = loadRect();
    const top = Math.round(r.top);
    cableGfx.clear();
    cableGfx.lineStyle(1, wallArt ? ca.cableColor : 0x2b2b2b).lineBetween(x + 0.5, cr.hookY, x + 0.5, top);
    if (loadSprite) loadSprite.setPosition(x + ca.loadDx, top + ca.loadDy);
    if (trolleySprite) trolleySprite.x = x + ca.trolleyDx;
    const g = craneGfx;
    g.clear();
    if (!trolleySprite) g.fillStyle(0x4c4f55).fillRect(x - 6, by - 2, 12, cr.hookY - by + 2);
    if (!loadSprite) {
      // Carga: manojo de varillas con chispitas.
      g.fillStyle(COLORS.rebar).fillRect(Math.round(r.left), top, CRANE.loadW, CRANE.loadH);
      g.fillStyle(0xa86a3a);
      for (let k = 1; k < CRANE.loadH; k += 2) g.fillRect(Math.round(r.left), top + k, CRANE.loadW, 1);
      g.fillStyle(COLORS.spark);
      for (let i = 0; i < 2; i++) g.fillRect(Math.round(r.left + Math.random() * CRANE.loadW), Math.round(r.top - 2 + Math.random() * (CRANE.loadH + 4)), 1, 1);
    }
    // Chispa pluma-línea (greybox).
    if (!boomSprite && boomSpark && scene.time.now < boomSpark.until) {
      g.lineStyle(1, COLORS.arc);
      g.beginPath();
      g.moveTo(boomSpark.x, line.y + 1);
      g.lineTo(boomSpark.x + Math.random() * 6 - 3, (line.y + by) / 2);
      g.lineTo(boomSpark.x, by - 3);
      g.strokePath();
    }
  };
  const craneHits = (b) => {
    if (rectsOverlap(shrink(b, CRANE.hitMarginPx), loadRect())) return true;
    return segmentHitsRect(crane.x, cr.hookY, crane.x, crane.loadTop, shrink(b, CRANE.hitMarginPx - 0.5));
  };
  const updateCrane = (delta) => {
    crane.elapsed += delta / 1000;
    loadClock.update(delta);
    crane.x = trolleyAt(crane.elapsed);
    crane.loadTop = loadTopAt(loadClock);
    if (crane.elapsed >= nextBoomSpark) {
      // El rng se consume igual con o sin arte: el ritmo de las chispas no depende de qué cargó.
      boomSpark = { x: rng.between(cr.boom.x1 + 8, cr.boom.x2 - 8), until: scene.time.now + CRANE.boomSparkMs };
      nextBoomSpark = crane.elapsed + rng.realInRange(CRANE.boomSparkMinS, CRANE.boomSparkMaxS);
      if (boomSprite) {
        boomSprite.setVisible(true);
        boomSprite.play(`${boomSparkKey}-zap`);
      }
    }
  };

  // --- Onda de la viga ---
  // El CENTRO de la franja va de xStart a xEnd durante el viaje; la franja se recorta a la viga. Así cada punto
  // de la viga (también los extremos) queda cubierto al menos media franja.
  const bm = room.beam;
  const travelS = (bm.xStart - bm.xEnd) / BEAM_WAVE.speed;
  const wave = new PhaseClock([
    ['warn', BEAM_WAVE.warnS],
    ['travel', travelS],
    ['pause', BEAM_WAVE.pauseS],
  ]);
  const waveStrip = () => {
    if (wave.phase !== 'travel') return null;
    const c = bm.xStart - BEAM_WAVE.speed * wave.since;
    return { c, x1: Math.max(bm.xEnd, c - BEAM_WAVE.widthPx / 2), x2: Math.min(bm.xStart, c + BEAM_WAVE.widthPx / 2) };
  };
  // Con arte: 3 piezas beam_wave (run) desde (centro - 24), recortadas a la viga con setCrop (el recorte es
  // horizontal y rectangular: no hace falta una máscara), y 2 sparks en el extremo derecho durante el aviso.
  // Depth tiles - 1: los tablones 'W' (tiles) tapan la franja donde pasa por debajo de ellos.
  const wa = bm.art;
  const waveKey = art('beam_wave');
  const wavePieces = waveKey
    ? Array.from({ length: 3 }, () => {
        const sp = scene.add.sprite(0, wa.y, waveKey, 0).setOrigin(0).setDepth(DEPTH.tiles - 1).setVisible(false);
        playIf(sp, `${waveKey}-run`);
        return sp;
      })
    : [];
  const endSparks = sparkKey
    ? wa.sparks.map((p) => scene.add.sprite(p.x, p.y, sparkKey, 0).setDepth(DEPTH.props).setVisible(false))
    : [];
  const waveGfx = scene.add.graphics().setDepth(DEPTH.tiles - 1);
  const drawWave = () => {
    const warn = wave.phase === 'warn';
    endSparks.forEach((sp, i) => {
      if (warn && !sp.visible) {
        playIf(sp, `${sparkKey}-crackle`);
        sp.anims.setProgress(i / 2); // desfasadas
      }
      sp.setVisible(warn);
    });
    const s = waveStrip();
    if (waveKey) {
      wavePieces.forEach((sp, i) => {
        if (!s) return sp.setVisible(false);
        const x0 = Math.round(s.c) - BEAM_WAVE.widthPx / 2 + i * TILE;
        const from = Math.max(0, bm.xEnd - x0);
        const to = Math.min(TILE, bm.xStart - x0);
        sp.x = x0;
        sp.setVisible(to > from);
        if (to > from) sp.setCrop(from, 0, to - from, sp.frame.height);
      });
    }
    const g = waveGfx;
    g.clear();
    if (warn && !endSparks.length) {
      g.fillStyle(COLORS.spark);
      for (let i = 0; i < 4; i++) g.fillRect(bm.xStart - 6 + Math.floor(Math.random() * 10), bm.top - 8 + Math.floor(Math.random() * 8), 1, 1);
      if (blink(60)) g.fillStyle(COLORS.wave).fillRect(bm.xStart - 4, bm.top - 2, 4, 2);
    }
    if (!s || waveKey) return;
    const top = bm.top - 4;
    g.fillStyle(COLORS.wave).fillRect(s.x1, top, s.x2 - s.x1, 4);
    g.fillStyle(COLORS.puddleZigzag);
    for (let x = Math.ceil(s.x1); x < s.x2; x++) {
      const p = (x + Math.floor(scene.time.now / 50)) % 4;
      g.fillRect(x, top + (p === 3 ? 1 : p), 1, 1);
    }
  };
  const beamHits = (b) => {
    const s = waveStrip();
    return !!s && standingIn(b, bm.top, s.x1, s.x2, BEAM_WAVE.edgeMarginPx);
  };

  // --- NPCs ---
  const npcAt = (id, options) => {
    const data = room.npcs.find((n) => n.id === id);
    const pos = tileToFeet(data);
    // Sin spritesheet: el placeholder de PreloadScene (npc-<id>).
    const texture = hasArt(data.texture) ? data.texture : `npc-${id}`;
    return new NpcActor(scene, pos.x, pos.y, texture, options);
  };
  // Maestro de obra: mano arriba ('stop', "quieto ahí") cuando el jugador entra a su zona sin haberle hablado.
  const maestro = npcAt('maestro', {
    noticed: () => (scene.flag('talkedToMaestro') ? 'idle' : 'stop'),
    onInteract: () => {
      const hooks = maestro.dialogHooks(player);
      if (scene.flag('talkedToMaestro')) say(D.maestro.again, null, hooks);
      else say(D.maestro.first, () => scene.setFlag('talkedToMaestro'), hooks);
    },
  });
  // Fin del juego: diálogo de la ingeniera → goToResults (para el timer, fundido a la escena final de la Seño y de
  // ahí a la tabla de tiempos).
  let finished = false;
  const finish = () => {
    finished = true;
    scene.freeze();
    goToResults(scene);
  };
  // Ingeniera: señala la escalera ('point') con su última línea y después de hablar; 'talk' en las demás.
  const pointing = () => (scene.flag('talkedToIngeniera') ? 'point' : 'idle');
  const ingeniera = npcAt('ingeniera', {
    ambient: pointing,
    noticed: pointing,
    onInteract: () => {
      const hooks = ingeniera.dialogHooks(player);
      const last = D.ingeniera.talk.length - 1;
      say(
        D.ingeniera.talk,
        () => {
          scene.setFlag('talkedToIngeniera');
          finish();
        },
        {
          ...hooks,
          onType: (i) => ingeniera.anim(i === last ? 'point' : 'talk'),
          onTyped: (i) => ingeniera.anim(i === last ? 'point' : 'idle'),
        },
      );
    },
  });

  // --- Debug (F1): las zonas letales que no son cuerpos de Arcade (línea, concreto, arco, carga y cable, onda) ---
  const debugGfx = scene.add.graphics().setDepth(DEPTH.debug - 1);
  const drawDebug = () => {
    debugGfx.clear();
    if (!scene.debug?.enabled) return;
    const g = debugGfx;
    g.lineStyle(1, 0xff00ff, 1);
    g.lineBetween(line.x1, line.y, line.x2, line.y);
    for (const cc of room.concrete) g.strokeRect(cc.x1, groundY - 1, cc.x2 - cc.x1, 1);
    if (arcs.phase === 'arc') {
      const r = arcRect();
      g.strokeRect(r.left, r.top, r.right - r.left, r.bottom - r.top);
    }
    const lr = loadRect();
    g.strokeRect(lr.left, lr.top, lr.right - lr.left, lr.bottom - lr.top);
    g.lineBetween(crane.x, cr.hookY, crane.x, crane.loadTop);
    const s = waveStrip();
    if (s) g.strokeRect(s.x1, bm.top - 2, s.x2 - s.x1, 2);
  };

  return {
    interactables: [maestro, ingeniera],
    mixer,
    arcs,
    crane,
    wave,
    waveStrip,
    // Tip de Game Over según la causa (GameScene.die la pasa a GameOver).
    deathTip: (cause) => D.deathTips[cause],
    update(time, delta) {
      mixer.update(delta);
      arcs.elapsed += delta / 1000;
      Object.assign(arcs, arcAt(arcs.elapsed));
      updateCrane(delta);
      wave.update(delta);
      drawMixer();
      drawConcrete();
      drawArc();
      drawCrane();
      drawWave();
      drawDebug();
      maestro.update(player);
      ingeniera.update(player);
      if (finished) return;

      const b = player.body;
      if (lineHits(b)) scene.die('line');
      else if (arcHits(b)) scene.die('arc');
      else if (craneHits(b)) scene.die('crane');
      else if (beamHits(b)) scene.die('beam');
      else if (concreteHits(b)) scene.die('concrete');
    },
  };
}
