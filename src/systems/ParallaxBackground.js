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
//     la capa baja factorY · Δ px en pantalla.
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

    // Posicionamos ya con el scroll actual, para que el fondo nuevo no se vea un frame mal ubicado.
    this.update();
    return this;
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
      ts.y = Math.round(this.baseY + factorY * rise);

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
