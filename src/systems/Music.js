import { MUSIC } from '../config/constants.js';

// Música de fondo. El SoundManager de Phaser es uno solo para todo el juego (no uno por escena), así
// que la pista sobrevive a los cambios de escena; por eso guardamos la referencia aquí, a nivel de módulo.
//
// Music.play(scene, 'menus') desde el create() de cada escena:
//  - si esa pista ya está sonando, no hace nada (no la reinicia);
//  - si suena otra, la detiene y arranca la nueva desde el principio, en loop.
// El navegador bloquea el audio hasta la primera tecla o clic; Phaser lo desbloquea solo y la pista
// empieza a sonar en ese momento.
let current = null;

export const Music = {
  play(scene, key) {
    if (current?.key === key) return;
    current?.stop();
    current?.destroy();
    current = null;
    // Si el archivo no se pudo cargar (p. ej. un clon del repo sin public/assets/music) seguimos en silencio.
    if (!scene.cache.audio.exists(key)) return;
    current = scene.sound.add(key, { loop: true, volume: MUSIC.volume });
    current.play();
  },

  stop() {
    current?.stop();
    current?.destroy();
    current = null;
  },
};
