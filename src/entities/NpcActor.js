import { NPC } from '../config/constants.js';
import { npcAnimKey } from '../data/npcs.js';
import { Interactable } from './Interactable.js';

// NPC con spritesheet animado. Comportamiento:
//  - Lejos del jugador: hace su animación "de ambiente" (`ambient()`: 'idle', 'hang', 'sweep'...) mirando
//    a la derecha, que es hacia donde mira el arte.
//  - Cuando el jugador entra a su zona (NPC.noticeRadius, mismo piso): para, lo mira (flipX) y pasa a 'idle'.
//    Excepción: si el ambiente es `lockedAmbient` (la abuela colgando ropa) sigue en lo suyo mirando a la derecha.
//  - En un diálogo con él: mira al jugador, 'talk' mientras se escribe cada línea e 'idle' entre líneas.
// `ambient` es una función para que pueda depender de flags (la abuela deja de colgar ropa después de hablar).
// `noticed` (opcional, también función): animación mientras mira al jugador en su zona, en vez de 'idle'
// (el vendedor del mercado señala los cables hasta que le hablan; doña Carmen sigue con las manos arriba).
export class NpcActor extends Interactable {
  constructor(scene, x, y, texture, { ambient = () => 'idle', noticed = () => 'idle', lockedAmbient = null, ...interact }) {
    super(scene, x, y, texture, { frame: 0, ...interact });
    this.sheet = texture; // key del spritesheet (`texture` ya es una propiedad del Sprite)
    this.ambient = ambient;
    this.noticed = noticed;
    this.lockedAmbient = lockedAmbient;
    this.talking = false;
    this.anim(ambient());
  }

  // Reproduce la animación `name` del NPC si existe (sin reiniciarla si ya está sonando).
  anim(name) {
    const key = npcAnimKey(this.sheet, name);
    if (this.scene.anims.exists(key)) this.play(key, true);
  }

  face(player) {
    this.setFlipX(player.x < this.x);
  }

  notices(player) {
    return Math.abs(player.x - this.x) <= NPC.noticeRadius && Math.abs(player.body.bottom - this.y) <= 8;
  }

  // Llamar en cada frame desde el update del nivel.
  update(player) {
    if (this.talking) return;
    const ambient = this.ambient();
    if (ambient !== this.lockedAmbient && this.notices(player)) {
      this.face(player);
      this.anim(this.noticed());
    } else {
      this.setFlipX(false);
      this.anim(ambient);
    }
  }

  // Ganchos para DialogBox.open: animan al NPC mientras habla. Al cerrar, update() retoma el control.
  dialogHooks(player) {
    this.talking = true;
    this.face(player);
    return {
      onType: () => this.anim('talk'),
      onTyped: () => this.anim('idle'),
      onClose: () => {
        this.talking = false;
        this.anim('idle');
      },
    };
  }
}
