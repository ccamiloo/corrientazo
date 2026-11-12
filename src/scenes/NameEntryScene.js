import * as Phaser from 'phaser';
import { GAME_W, GAME_H, DEPTH, UI, RESULTS, HEADS } from '../config/constants.js';
import { currentCharacter } from '../data/characters.js';
import { START_ROOM } from '../data/rooms/index.js';
import { startNewGame } from '../systems/startGame.js';
import { Music } from '../systems/Music.js';
import { pixelText } from '../systems/pixelText.js';
import { menuBackground, menuCharacter, drawPedestal } from '../systems/menuHelpers.js';
import { NAME_MAX, isNameChar, sanitizeName, loadPlayerName, savePlayerName } from '../systems/playerName.js';

const N = RESULTS.name;

// Comanda del nombre (docs/mockups/mockup_nombre_x3.png): después de la selección y antes del primer nivel.
// Se escribe con el teclado físico; no usa Controls porque W, S, A, D y Espacio son letras del nombre.
export class NameEntryScene extends Phaser.Scene {
  constructor() {
    super('NameEntry');
  }

  create() {
    Music.play(this, 'menus');
    const character = currentCharacter(this.registry);
    this.confirmed = false;

    // Fondo: la calle de la selección, oscurecida.
    menuBackground(this);
    this.add.rectangle(0, 0, GAME_W, GAME_H, RESULTS.dimColor, RESULTS.dimAlpha).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.background + 10);

    pixelText(this, GAME_W / 2, N.titleY, '¿Cómo te llamas?', { color: UI.yellow, scale: 2, origin: [0.5, 0] }).setScrollFactor(0);

    // Personaje x2 sobre el pedestal de la selección x2. drawPedestal dibuja en coordenadas absolutas; con la
    // escala 2 del Graphics, se le pasan las coordenadas a la mitad (centro y cara de arriba).
    const pw = 40; // MENU.pedestal.w sin escalar
    drawPedestal(this, N.pedestal.x / 2 + pw / 2, N.pedestal.y / 2).setScale(N.pedestal.scale);
    menuCharacter(this, character, N.character.x, N.character.feetY, 'idle').setScale(2);

    // Comanda: un Container centrado en el ticket, así el "sello" escala desde el centro.
    const tw = 232;
    const th = 136;
    const cx = N.ticket.x + tw / 2;
    const cy = N.ticket.y + th / 2;
    const at = (x, y) => [x - cx, y - cy]; // px de pantalla → relativos al centro del ticket
    this.ticket = this.add.container(cx, cy).setScrollFactor(0);
    this.ticket.add(this.add.image(...at(N.ticket.x, N.ticket.y), 'ne-ticket').setOrigin(0));

    // Nombre: dos textos (escala 2 y escala 1) y se muestra el que quepa. El pixelText no cambia de escala en vivo.
    this.big = pixelText(this, ...at(N.text.x, N.text.y), '', { color: RESULTS.ink, outline: false, scale: 2 });
    this.small = pixelText(this, ...at(N.text.x, N.text.ySmall), '', { color: RESULTS.ink, outline: false });
    this.cursor = this.add.rectangle(0, at(0, N.cursor.y)[1], N.cursor.w, N.cursor.h, N.cursor.color).setOrigin(0);
    this.counter = pixelText(this, ...at(N.counter.right, N.counter.y), '', { color: N.counter.color, outline: false, origin: [1, 0] });
    const head = this.add.image(...at(N.head.x, N.head.y), 'lb-heads', Math.max(0, HEADS.indexOf(character.texture))).setOrigin(0);
    const charName = pixelText(this, ...at(N.charName.x, N.charName.y), character.name, { color: RESULTS.ink, outline: false });
    this.ticket.add([this.big, this.small, this.cursor, this.counter, head, charName]);

    // Pie.
    pixelText(this, N.footer.leftRight, N.footer.y, 'Escribe tu nombre', { color: RESULTS.footer, origin: [1, 0] }).setScrollFactor(0);
    pixelText(this, N.footer.rightLeft, N.footer.y, 'Enter para confirmar', { color: RESULTS.footer }).setScrollFactor(0);

    // Cursor que titila.
    this.time.addEvent({ delay: N.cursor.blinkMs, loop: true, callback: () => !this.confirmed && this.cursor.setVisible(!this.cursor.visible) });

    // Prellenado: el de esta sesión o el último guardado en el navegador.
    this.name = sanitizeName(this.registry.get('playerName') ?? loadPlayerName() ?? '');
    this.refresh();

    this.seen = new WeakSet(); // eventos ya procesados (ver onKey)
    this.input.keyboard.on('keydown', (event) => this.onKey(event));
  }

  onKey(event) {
    // Phaser 4 procesa la cola del teclado en cuanto llega cada evento, pero solo la vacía al final del paso:
    // si llegan dos teclas en el mismo paso (escribiendo rápido, o con el loop frenado en una pestaña de
    // fondo), la segunda vuelve a entregar la primera. El evento repetido es el mismo objeto: se ignora.
    if (this.seen.has(event)) return;
    this.seen.add(event);
    if (this.confirmed) return;
    const { key } = event;
    // Repetición automática de Enter (venía apretado desde la selección): no confirma un nombre prellenado.
    if (key === 'Enter' && event.repeat) return;
    if (key === 'Enter') {
      this.confirm();
    } else if (key === 'Escape') {
      this.scene.start('CharacterSelect');
    } else if (key === 'Backspace') {
      event.preventDefault();
      this.name = [...this.name].slice(0, -1).join('');
      this.refresh();
    } else if (key.length === 1 && isNameChar(key) && [...this.name].length < NAME_MAX) {
      // key.length === 1 deja fuera 'Shift', 'ArrowLeft', 'Dead' (la tecla de la tilde antes de la vocal)...
      event.preventDefault(); // Espacio no debe desplazar la página
      this.name += key;
      this.refresh();
    }
  }

  refresh() {
    // ¿Cabe a escala 2? Si no, escala 1 (centrado verticalmente en la misma caja).
    this.big.setText(this.name);
    const fits = this.big.textWidth <= N.text.maxWidthScale2;
    this.big.setVisible(fits);
    this.small.setText(this.name).setVisible(!fits);
    const shown = fits ? this.big : this.small;
    // El cursor va 2 px a la derecha del texto (con el nombre vacío, en el borde izquierdo de la caja).
    this.cursor.x = shown.x + (this.name ? Math.ceil(shown.textWidth) : 0) + N.cursor.gap;
    this.cursor.setVisible(true); // al escribir, el cursor reaparece (no queda apagado a mitad del titileo)
    this.counter.setText(`${[...this.name].length}/${NAME_MAX}`);
  }

  confirm() {
    const name = this.name.trim();
    if (!name) return; // vacío (o solo espacios): no hace nada
    this.confirmed = true;
    this.name = name;
    this.refresh();
    this.cursor.setVisible(false);
    this.registry.set('playerName', name);
    savePlayerName(name);
    // Sello: la comanda salta a 1.1 y vuelve a 1 en 100 ms; después arranca el juego como antes.
    this.ticket.setScale(N.stampScale);
    this.tweens.add({ targets: this.ticket, scale: 1, duration: N.stampMs, ease: 'Quad.easeOut' });
    this.time.delayedCall(N.stampMs + N.startDelayMs, () => startNewGame(this, START_ROOM));
  }
}
