import * as Phaser from 'phaser';
import { GAME_W, GAME_H, DEPTH, UI, RESULTS, HEADS } from '../config/constants.js';
import { CHARACTERS } from '../data/characters.js';
import { Leaderboard } from '../systems/Leaderboard.js';
import { formatTimeShort } from '../systems/PlayTimer.js';
import { Music } from '../systems/Music.js';
import { pixelText } from '../systems/pixelText.js';
import { menuBackground } from '../systems/menuHelpers.js';

const B = RESULTS.board;
const C = RESULTS.card;
const headFrame = (character) => Math.max(0, HEADS.indexOf(character));

// Tabla de tiempos (docs/mockups/mockup_tabla_x3.png y mockup_tabla_fuera_top_x3.png).
//  - mode 'result' (goToResults, al terminar el juego): guarda el tiempo y muestra el top 10 con la fila del
//    jugador resaltada, más la tarjeta "Tu corrientazo" (aunque haya quedado fuera del top).
//  - mode 'view' (botón del menú principal): solo el tablero, sin resaltado.
// Estados: 'loading' → 'done' | 'failed'. Sin conexión, Enter reintenta (sin duplicar el envío: ver key en
// Leaderboard.submitScore). Cualquier tecla vuelve al menú, pero no mientras carga.
export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('Leaderboard');
  }

  init(data) {
    this.mode = data.mode === 'result' ? 'result' : 'view';
    this.score = data.score ?? null;
    this.key = data.key ?? null;
    this.myId = null;
    // Phaser reutiliza la instancia de la escena: sin esto, rankText/totalText quedan apuntando a los textos
    // (ya destruidos) de la vez anterior en el otro modo, y usarlos lanza un error que traba la pantalla.
    this.rankText = null;
    this.totalText = null;
  }

  create() {
    Music.play(this, 'menus');
    this.state = 'loading';
    this.alive = true;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (this.alive = false));

    menuBackground(this);
    this.add.rectangle(0, 0, GAME_W, GAME_H, RESULTS.dimColor, RESULTS.dimAlpha).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.background + 10);

    this.add.image(B.x, B.y, 'lb-board').setOrigin(0);
    this.rowsLayer = this.add.container(0, 0); // filas (se rearma en cada carga)
    this.status = pixelText(this, B.x + 148, B.statusY, '', { color: B.color, outline: false, origin: 0.5 });

    if (this.mode === 'result') this.createCard();
    else this.createSide();

    this.footer = pixelText(this, RESULTS.footerX, RESULTS.footerY, '', { color: RESULTS.footer, origin: [0.5, 0] });

    // Teclado: solo cuando no está cargando (y tras un margen, para que la tecla de antes no salte la pantalla).
    this.acceptAt = this.time.now + RESULTS.inputDelayMs;
    this.input.keyboard.on('keydown', (event) => {
      if (this.state === 'loading' || this.time.now < this.acceptAt || event.repeat) return;
      if (this.state === 'failed' && event.key === 'Enter') this.fetchScores();
      else this.scene.start('Title');
    });

    this.fetchScores();
  }

  // Tarjeta "Tu corrientazo": personaje x2, nombre, tiempo, puesto y muertes.
  createCard() {
    const s = this.score;
    this.add.image(C.x, C.y, 'lb-card').setOrigin(0);
    const character = CHARACTERS.find((c) => c.texture === s.character) ?? CHARACTERS[0];
    this.add.sprite(C.character.x, C.character.y, character.texture, character.sheet ? 0 : undefined).setOrigin(0).setScale(2);

    // Nombre a escala 2; si un nombre largo no cabe en la tarjeta, a escala 1.
    let name = pixelText(this, C.name.cx, C.name.y, s.name, { scale: 2, origin: [0.5, 0] });
    if (name.textWidth > C.name.maxWidth) {
      name.destroy();
      name = pixelText(this, C.name.cx, C.name.y + 6, s.name, { origin: [0.5, 0] });
    }

    // Valores alineados a la derecha. Tiempo y muertes se saben sin conexión; el puesto, no.
    pixelText(this, C.right, C.timeY, formatTimeShort(s.timeMs), { outline: false, origin: [1, 0] });
    this.rankText = pixelText(this, C.right, C.rankY, '...', { color: UI.yellow, outline: false, origin: [1, 0] });
    const deaths = pixelText(this, C.right, C.deathsY, String(s.deaths), { outline: false, origin: [1, 0] });
    this.add.image(C.right - Math.ceil(deaths.textWidth) - C.boltGap, C.deathsY + 1, 'lb-bolt').setOrigin(0);
  }

  // Modo solo lectura: a la derecha, el título del juego, los cinco personajes y cuántas partidas hay.
  createSide() {
    const cx = RESULTS.footerX;
    pixelText(this, cx, 70, 'Corrientazo', { color: UI.yellow, scale: 2, origin: [0.5, 0] });
    pixelText(this, cx, 98, 'Los más rápidos en', { color: UI.white, origin: [0.5, 0] });
    pixelText(this, cx, 110, 'llegar al almuerzo', { color: UI.white, origin: [0.5, 0] });
    const step = 26;
    HEADS.forEach((_, i) => this.add.image(cx - 2 * step + i * step, 140, 'lb-heads', i).setOrigin(0.5, 0));
    this.totalText = pixelText(this, cx, 172, '', { color: UI.dim, origin: [0.5, 0] });
  }

  // Cualquier error inesperado (no de red: esos ya vienen como { ok: false }) termina en "Sin conexión" con
  // reintento, nunca en un "Cargando..." eterno.
  async fetchScores() {
    try {
      await this.fetchScoresUnsafe();
    } catch (error) {
      console.error('[LeaderboardScene]', error);
      if (this.alive) this.fail();
    }
  }

  async fetchScoresUnsafe() {
    this.state = 'loading';
    this.rowsLayer.removeAll(true);
    this.status.setText('Cargando...').setVisible(true);
    this.footer.setText('');
    if (this.rankText) this.rankText.setText('...');

    // Resultado: primero se guarda el tiempo (el puesto y la fila resaltada dependen de que ya esté guardado).
    if (this.mode === 'result' && !this.myId) {
      const sent = await Leaderboard.submitScore(this.score, this.key);
      if (!this.alive) return;
      if (!sent.ok) return sent.invalid ? this.invalid() : this.fail();
      this.myId = sent.id;
    }

    const [top, rank, total] = await Promise.all([
      Leaderboard.getTop(B.rows),
      this.mode === 'result' ? Leaderboard.getRank(this.score.timeMs) : Promise.resolve({ ok: true }),
      Leaderboard.getTotal(),
    ]);
    if (!this.alive) return;
    if (!top.ok || !rank.ok || !total.ok) return this.fail();

    this.status.setVisible(false);
    this.drawRows(top.rows);
    if (this.mode === 'result') this.rankText.setText(`${rank.rank} de ${total.total}`);
    else this.totalText.setText(total.total === 1 ? '1 partida' : `${total.total} partidas`);
    if (!top.rows.length) this.status.setText('Todavía no hay tiempos').setVisible(true);
    this.ready('Presiona cualquier tecla');
  }

  fail() {
    this.status.setText('Sin conexión').setVisible(true);
    if (this.rankText) this.rankText.setText('sin conexión');
    this.ready('Enter: reintentar     Otra tecla: salir');
  }

  // El tiempo no se puede guardar (p. ej. menos de LEADERBOARD.minTimeMs, con F9 en desarrollo): sin reintento.
  invalid() {
    this.status.setText('Tiempo no válido').setVisible(true);
    this.rankText.setText('sin puesto');
    this.ready('Presiona cualquier tecla');
  }

  ready(footer) {
    this.state = footer.startsWith('Enter') ? 'failed' : 'done';
    this.footer.setText(footer);
  }

  drawRows(rows) {
    rows.forEach((row, i) => {
      const y = B.rowY0 + i * B.rowH;
      const mine = this.mode === 'result' && row.id === this.myId;
      const color = mine ? UI.yellow : B.color;
      const parts = [];
      if (mine) {
        // Resaltado: los dos frames de lb_row_hi alternando, debajo del texto de la fila.
        const hi = this.add.sprite(B.hi.x, y + B.hi.dy, 'lb-row-hi', 0).setOrigin(0);
        this.time.addEvent({ delay: B.hi.blinkMs, loop: true, callback: () => hi.active && hi.setFrame(hi.frame.name == 0 ? 1 : 0) });
        parts.push(hi);
      }
      if (i < 3) parts.push(this.add.image(B.medal.x, y + B.medal.dy, 'lb-medals', i).setOrigin(0));
      else parts.push(pixelText(this, B.rank.right, y + 2, String(i + 1), { color: B.rank.color, outline: false, origin: [1, 0] }));
      // Cabecita: el frame mide 20x18; en la tabla se muestran los 16 de arriba.
      parts.push(this.add.image(B.head.x, y, 'lb-heads', headFrame(row.character)).setOrigin(0).setCrop(0, 0, B.head.w, B.head.h));
      parts.push(pixelText(this, B.name.x, y + B.name.dy, String(row.name ?? ''), { color, outline: false }));
      parts.push(pixelText(this, B.time.right, y + B.time.dy, formatTimeShort(row.timeMs ?? 0), { color, outline: false, origin: [1, 0] }));
      parts.push(this.add.image(B.bolt.x, y + B.bolt.dy, 'lb-bolt').setOrigin(0));
      parts.push(pixelText(this, B.deaths.x, y + B.deaths.dy, String(row.deaths ?? 0), { color, outline: false }));
      this.rowsLayer.add(parts);
    });
  }
}
