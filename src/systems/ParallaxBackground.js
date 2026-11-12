import * as Phaser from 'phaser';
import { GAME_W, GAME_H, PARALLAX, BACKGROUNDS, DEPTH } from '../config/constants.js';

// Key de textura de una capa de un fondo, p. ej. bgKey('park', 'far') → 'bg-park-far'.
// PreloadScene carga con estas keys y este componente las usa: es el único "contrato" entre ambos.
export const bgKey = (background, layerId) => `bg-${background}-${layerId}`;

// Fondo con parallax de varias capas, anclado al suelo de la sala.
//
// Uso:
//   const bg = new ParallaxBackground(scene, 'street');
//   ...configurar la cámara (bounds + startFollow)...
//   bg.anchor(groundY);         // groundY = superficie del suelo de la sala, px de mundo
//   bg.setBackground('park');   // cambia de fondo en caliente
//
// Cada capa es un TileSprite de ancho de pantalla y alto de su imagen, fijo a la cámara (scrollFactor 0):
//   - Horizontal: se desplaza la textura (tilePositionX = scrollX · factorX). Como la textura se repite,
//     la capa nunca se acaba aunque la sala sea más ancha que la imagen.
//   - Vertical: se mueve la y del TileSprite (no tilePositionY, ver update()). Con la cámara lo más
//     abajo posible, la fila groundLine de la imagen coincide con el suelo; si la cámara sube Δ px,
//     la capa baja factorY · Δ px en pantalla. Excepción: con factorY 0 (cielo) la capa queda fija en
//     y = 0, cubriendo toda la pantalla.
//
// También pone el color de fondo de la cámara de la escena en el de la fila más baja del cielo: si algún
// día queda un hueco entre capas, se ve "más cielo" en vez del negro del canvas. Es el color de ESTA
// cámara; los menús (otras escenas) siguen con el backgroundColor oscuro del juego.
export class ParallaxBackground {
  constructor(scene, background) {
    this.scene = scene;
    this.cam = scene.cameras.main;
    this.layers = [];
    // Hasta que se llame anchor() usamos una referencia neutra (capas pegadas arriba de la pantalla).
    this.maxScrollY = 0;
    this.baseY = 0;

    this.setBackground(background);

    // ¿Por qué no en update()? Phaser calcula el scroll de la cámara (follow + lerp) en
    // camera.preRender, DESPUÉS de update. Leer scrollX en update daría el valor del frame anterior
    // y el fondo iría un frame atrasado respecto al mundo. FOLLOW_UPDATE se emite justo tras
    // calcular el scroll y antes de dibujar, así que fondo y mundo usan el mismo valor.
    this.cam.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.update, this);
    // La cámara principal se reutiliza entre reinicios de la escena: quitamos el listener al salir
    // para no acumular uno por cada muerte.
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
  }

  // Crea (o reemplaza) las capas del fondo indicado. Si el nombre no existe, avisa y usa el primero.
  setBackground(background) {
    if (!BACKGROUNDS.includes(background)) {
      console.warn(`[Parallax] fondo desconocido "${background}"; se usa "${BACKGROUNDS[0]}"`);
      background = BACKGROUNDS[0];
    }
    this.name = background;

    this.layers.forEach((l) => l.ts.destroy());
    this.layers = [];

    PARALLAX.layers.forEach((layer, i) => {
      const key = bgKey(background, layer.id);
      // Si el PNG no cargó, omitimos la capa en vez de dibujar la textura de "missing" de Phaser.
      if (!this.scene.textures.exists(key)) return;
      // Alto = alto de la imagen: así el TileSprite nunca repite en vertical (tilePositionY queda en 0)
      // y la posición vertical se maneja solo con su y.
      const imageH = this.scene.textures.get(key).getSourceImage().height;
      const ts = this.scene.add
        .tileSprite(0, 0, GAME_W, imageH, key)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH.background + i);
      this.layers.push({ ...layer, key, ts, lastGap: 0 });
    });

    // Si el cielo no cargó, dejamos el color que tenga la cámara (el oscuro del juego).
    const skyColor = this.skyBottomColor(background);
    if (skyColor !== null) this.cam.setBackgroundColor(skyColor);

    // Posicionamos ya con el scroll actual, para que el fondo nuevo no se vea un frame mal ubicado.
    this.update();
    return this;
  }

  // Color de la fila más baja de la capa con factorY 0 (el cielo). Se lee de la imagen en vez de
  // escribirlo a mano, así sigue siendo correcto si cambia el arte. Tomamos el color más frecuente de
  // esa fila por si tiene algún detalle (sol, edificio) que no represente la banda.
  skyBottomColor(background) {
    const sky = PARALLAX.layers.find((l) => l.factorY === 0);
    const key = sky && bgKey(background, sky.id);
    if (!key || !this.scene.textures.exists(key)) return null;
    const { width, height } = this.scene.textures.get(key).getSourceImage();
    const counts = new Map();
    for (let x = 0; x < width; x++) {
      const c = this.scene.textures.getPixel(x, height - 1, key);
      if (!c || c.alpha < 255) continue;
      const rgb = c.color; // entero 0xRRGGBB
      counts.set(rgb, (counts.get(rgb) ?? 0) + 1);
    }
    let best = null;
    let bestN = 0;
    for (const [rgb, n] of counts) if (n > bestN) [best, bestN] = [rgb, n];
    return best;
  }

  // Siguiente fondo de la lista, en ciclo (para la tecla de debug F2).
  cycle() {
    const i = BACKGROUNDS.indexOf(this.name);
    return this.setBackground(BACKGROUNDS[(i + 1) % BACKGROUNDS.length]);
  }

  // Referencia vertical, calculada con la geometría real de la sala. Llamar después de setBounds de la cámara.
  anchor(groundY) {
    // scrollY máximo = cámara lo más abajo posible dentro de sus bounds.
    this.maxScrollY = this.cam.getBounds().bottom - this.cam.height;
    // En esa posición, el suelo se ve en pantalla en groundY - maxScrollY. Queremos que la fila
    // groundLine de la imagen caiga ahí, así que el borde superior de la capa va groundLine px más arriba.
    // Ej. sala de prueba: suelo 384, maxScrollY 178 → suelo en pantalla 206 → capa en y = 206 - 256 = -50.
    this.baseY = groundY - this.maxScrollY - PARALLAX.groundLine;
    this.update();
    return this;
  }

  // Ancla para pantallas sin sala (menús): la fila `row` de las capas queda en la y de pantalla `screenY`.
  // Usa el scroll vertical actual como referencia (en los menús la cámara no se mueve en vertical).
  // Ojo: sin startFollow la cámara no emite FOLLOW_UPDATE, así que la escena llama update() a mano.
  anchorScreen(screenY, row) {
    this.maxScrollY = this.cam.scrollY;
    this.baseY = screenY - row;
    this.update();
    return this;
  }

  update() {
    const { scrollX, scrollY } = this.cam;
    // Δ = cuánto subió la cámara respecto a la referencia (≥ 0).
    const rise = this.maxScrollY - scrollY;
    const debug = !!this.scene.registry.get('debug');
    for (const layer of this.layers) {
      const { ts, factorX, factorY } = layer;
      // Redondeo a pixel entero: con factores como 0.05 o 0.2 el desplazamiento sería fraccionario
      // y el muestreo NEAREST alternaría entre dos filas/columnas de pixeles (temblor).
      ts.tilePositionX = Math.round(scrollX * factorX);
      // Vertical: movemos el TileSprite y no tilePositionY a propósito. tilePositionY repite la textura,
      // así que si la capa bajara más allá de su borde aparecería la parte de arriba de la imagen debajo;
      // moviendo y, lo que queda fuera de la imagen es simplemente transparente (y se nota si pasa).
      // factorY 0 = infinitamente lejos: fijo a la pantalla en y = 0 (no se le aplica el ancla).
      ts.y = factorY === 0 ? 0 : Math.round(this.baseY + factorY * rise);

      if (layer.checkBottom && debug) this.checkBottom(layer);
    }
  }

  // Debug: si el borde inferior de la capa queda por encima del de la pantalla, debajo se vería un hueco.
  // Avisa solo cuando el faltante cambia (no en cada frame), y también cuando se cierra.
  checkBottom(layer) {
    const gap = Math.max(0, GAME_H - (layer.ts.y + layer.ts.height));
    if (gap === layer.lastGap) return;
    if (gap > 0) console.warn(`[Parallax] ${layer.key}: el borde inferior queda ${gap} px por encima de la pantalla`);
    else console.info(`[Parallax] ${layer.key}: borde inferior cubierto otra vez`);
    layer.lastGap = gap;
  }

  destroy() {
    this.cam.off(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.update, this);
    this.layers.forEach((l) => l.ts.destroy());
    this.layers = [];
  }
}
