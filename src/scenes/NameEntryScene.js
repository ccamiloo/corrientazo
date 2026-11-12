import * as Phaser from 'phaser';
import { GAME_W, GAME_H, DEPTH, UI, RESULTS, HEADS } from '../config/constants.js';
import { currentCharacter } from '../data/characters.js';
import { START_ROOM } from '../data/rooms/index.js';
import { startNewGame } from '../systems/startGame.js';
import { Music } from '../systems/Music.js';
import { pixelText } from '../systems/pixelText.js';
import { menuBackground, menuCharacter, drawPedestal } from '../systems/menuHelpers.js';
import { bindPrompt } from '../systems/prompts.js';
import { Fullscreen } from '../systems/Fullscreen.js';
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
    // Phaser reutiliza la instancia de la escena: lo del input HTML se reinicia aquí.
    this.field = null;
    this.gameShift = 0;

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

    // Pie. Con teclado: "Escribe tu nombre | Enter para confirmar". En táctil: un solo texto centrado a la
    // izquierda del botón Listo.
    const footLeft = pixelText(this, N.footer.leftRight, N.footer.y, '', { color: RESULTS.footer, origin: [1, 0] }).setScrollFactor(0);
    const footRight = pixelText(this, N.footer.rightLeft, N.footer.y, '', { color: RESULTS.footer }).setScrollFactor(0);
    bindPrompt(this, footRight, 'nameConfirm');
    this.doneButton = this.makeDoneButton();
    bindPrompt(this, footLeft, 'nameWrite', {}, (touch) => {
      footLeft.setPosition(touch ? N.touch.footerRight : N.footer.leftRight, N.footer.y);
      this.doneButton.setVisible(touch);
      this.setTouchInput(touch);
    });
    this.events.once('shutdown', () => this.setTouchInput(false));

    // Cursor que titila.
    this.time.addEvent({ delay: N.cursor.blinkMs, loop: true, callback: () => !this.confirmed && this.cursor.setVisible(!this.cursor.visible) });

    // Prellenado: el de esta sesión o el último guardado en el navegador.
    this.name = sanitizeName(this.registry.get('playerName') ?? loadPlayerName() ?? '');
    this.refresh();
    if (this.field) this.field.input.value = this.name;

    this.seen = new WeakSet(); // eventos ya procesados (ver onKey)
    this.input.keyboard.on('keydown', (event) => this.onKey(event));
  }

  // Botón "Listo" en pixel art (táctil): caja amarilla con contorno y sombra, 64x30 px (≥ 32 de alto con el
  // área de toque ampliada). Presionado baja 2 px.
  makeDoneButton() {
    const { x, y, w, h } = N.touch.done;
    const btn = this.add.container(x, y).setScrollFactor(0);
    const g = this.add.graphics();
    const draw = (down) => {
      const dy = down ? 2 : 0;
      g.clear();
      if (!down) g.fillStyle(UI.outline).fillRect(-w / 2 + 1, -h / 2 + 3, w, h); // sombra
      g.fillStyle(UI.outline).fillRect(-w / 2 - 1, -h / 2 - 1 + dy, w + 2, h + 2);
      g.fillStyle(UI.yellow).fillRect(-w / 2, -h / 2 + dy, w, h);
      g.fillStyle(0xfff3b0).fillRect(-w / 2, -h / 2 + dy, w, 2);
      label.setY(dy - 5);
    };
    const label = pixelText(this, 0, 0, 'Listo', { color: UI.outline, outline: false, origin: [0.5, 0] });
    btn.add([g, label]);
    draw(false);
    const hit = this.add.zone(x, y, w + 16, h + 12).setScrollFactor(0).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', () => draw(true));
    hit.on('pointerout', () => draw(false));
    hit.on('pointerup', () => {
      draw(false);
      this.confirm();
    });
    btn.hit = hit;
    btn.setVisible = (v) => {
      Phaser.GameObjects.Container.prototype.setVisible.call(btn, v);
      hit.input.enabled = v;
      return btn;
    };
    return btn;
  }

  // --- Nombre en el celular: un <input> HTML real, invisible, encima de la comanda ---
  // Solo así aparece el teclado del sistema (con ñ, tildes y autocorrección apagada). Tocar la comanda toca el
  // input mismo (está encima), y además se llama focus() dentro del mismo toque, que es lo que exige iOS.
  setTouchInput(on) {
    if (on && !this.field) {
      const form = document.createElement('form');
      const input = document.createElement('input');
      Object.assign(input, { type: 'text', maxLength: NAME_MAX, autocomplete: 'off', spellcheck: false, value: this.name ?? '' });
      input.setAttribute('autocapitalize', 'words');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('enterkeyhint', 'done');
      input.setAttribute('aria-label', '¿Cómo te llamas?');
      // Invisible pero tocable. font-size 16 px: con menos, iOS hace zoom a la página al enfocar.
      Object.assign(form.style, { position: 'fixed', margin: '0', zIndex: '5' });
      Object.assign(input.style, {
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        opacity: '0',
        border: '0',
        padding: '0',
        background: 'transparent',
        color: 'transparent',
        caretColor: 'transparent',
        fontSize: '16px',
        touchAction: 'manipulation',
      });
      form.append(input);
      (document.getElementById('app') ?? document.body).append(form); // en #app: se ve también en pantalla completa

      input.addEventListener('pointerdown', () => input.focus());
      // Cada cambio: solo caracteres permitidos (los mismos del teclado físico) y máximo NAME_MAX.
      input.addEventListener('input', () => {
        const clean = sanitizeName(input.value);
        if (clean !== input.value) input.value = clean;
        if (this.confirmed) return;
        this.name = clean;
        this.refresh();
      });
      // Enter / "Listo" del teclado del sistema.
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.confirm();
      });
      // Con el input enfocado, las teclas son para el input: que Phaser no las cancele (W, A, S, D, Espacio y
      // flechas están "capturadas" por los controles de otras escenas).
      input.addEventListener('focus', () => {
        this.input.keyboard.disableGlobalCapture();
        this.keepVisible();
      });
      input.addEventListener('blur', () => {
        this.input.keyboard?.enableGlobalCapture();
        this.shiftGame(0);
      });

      this.field = { form, input };
      this.onViewport = () => {
        this.placeField();
        if (document.activeElement === input) this.keepVisible();
      };
      window.addEventListener('resize', this.onViewport);
      window.visualViewport?.addEventListener('resize', this.onViewport);
      window.visualViewport?.addEventListener('scroll', this.onViewport);
      this.scale.on('resize', this.onViewport);
      this.placeField();
    } else if (!on && this.field) {
      this.field.input.blur();
      this.field.form.remove();
      this.field = null;
      window.removeEventListener('resize', this.onViewport);
      window.visualViewport?.removeEventListener('resize', this.onViewport);
      window.visualViewport?.removeEventListener('scroll', this.onViewport);
      this.scale.off('resize', this.onViewport);
      this.input.keyboard?.enableGlobalCapture();
      this.shiftGame(0);
    }
  }

  // Ubica el input sobre la comanda: rect del canvas en pantalla y su escala (px de CSS por px del juego).
  placeField() {
    if (!this.field) return;
    const r = this.game.canvas.getBoundingClientRect();
    const k = r.width / GAME_W;
    const shift = this.gameShift ?? 0; // el rect ya incluye el corrimiento: se descuenta para no sumarlo dos veces
    Object.assign(this.field.form.style, {
      left: `${r.left + N.ticket.x * k}px`,
      top: `${r.top + shift + N.ticket.y * k}px`,
      width: `${N.touch.ticketW * k}px`,
      height: `${N.touch.ticketH * k}px`,
      transform: shift ? `translateY(${-shift}px)` : '',
    });
  }

  // Con el teclado del sistema abierto, el área visible se achica (visualViewport): si la comanda queda tapada,
  // se sube el juego entero (y el input con él) lo justo para que el renglón del nombre quede a la vista.
  keepVisible() {
    const vv = window.visualViewport;
    if (!vv) return;
    const r = this.game.canvas.getBoundingClientRect();
    const k = r.width / GAME_W;
    const shift = this.gameShift ?? 0;
    const nameBottom = r.top + shift + (N.text.y + 28) * k; // borde de abajo del nombre, sin corrimiento
    const visibleBottom = vv.offsetTop + vv.height;
    this.shiftGame(Math.max(0, Math.ceil(nameBottom - visibleBottom + 8)));
  }

  shiftGame(px) {
    if ((this.gameShift ?? 0) === px) return;
    this.gameShift = px;
    this.game.canvas.style.transform = px ? `translateY(${-px}px)` : '';
    this.placeField();
  }

  onKey(event) {
    // Teclas escritas en el input HTML (táctil): las maneja el propio input, no se duplican aquí.
    if (this.field && event.target === this.field.input) return;
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
      // Si ese Esc fue el del navegador para salir de pantalla completa, no es "volver a la selección".
      if (Fullscreen.active || Fullscreen.justExited()) return;
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
    if (this.field) {
      this.field.input.value = name;
      this.field.input.blur(); // cierra el teclado del sistema antes de empezar
    }
    // Sello: la comanda salta a 1.1 y vuelve a 1 en 100 ms; después arranca el juego como antes.
    this.ticket.setScale(N.stampScale);
    this.tweens.add({ targets: this.ticket, scale: 1, duration: N.stampMs, ease: 'Quad.easeOut' });
    this.time.delayedCall(N.stampMs + N.startDelayMs, () => startNewGame(this, START_ROOM));
  }
}
