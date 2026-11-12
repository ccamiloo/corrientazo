Interfaz de Corrientazo

fonts/corrientazo_font.png + .xml   Fuente pixel propia (BMFont, formato XML).
  Carga en Phaser: this.load.bitmapFont('pixel', 'assets/fonts/corrientazo_font.png', 'assets/fonts/corrientazo_font.xml')
  Uso: this.add.bitmapText(x, y, 'pixel', 'Texto', 11)   (tamaño nativo 11: no escalar)
  Glyphs blancos: colorear con setTint. Celda de 11 px, interlineado 12, línea base en la fila 8.
  Incluye A-Z, a-z, 0-9, Á É Í Ó Ú Ü Ñ á é í ó ú ü ñ, ¿ ¡ ? ! . , : ; ' " - + = ( ) / % * _ < > y las flechas ← → ↑ ↓.

ui/logo.png          260x49, logo de CORRIENTAZO.
ui/button_jugar.png  spritesheet de 3 frames de 88x29: 0 normal, 1 hover, 2 presionado.
ui/arrow.png         spritesheet de 2 frames de 11x10: flecha de selección (alternar para que rebote).
