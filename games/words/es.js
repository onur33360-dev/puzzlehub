// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · Español (es)
// ═══════════════════════════════════════════════════════════════════════
//
// BU DOSYA YALNIZCA VERİDİR. Oyun kodu games.js'te; buraya kelime
// eklemek hiçbir satırın değişmesini gerektirmez.
//
// SEÇİM ÖLÇÜTÜ: günlük, herkesin bildiği somut isimler. Özel isim yok,
// kısaltma yok, çekimli biçim yok, rahatsız edici içerik yok.
//
// ALFABE HAVUZDAN TÜRETİLMİŞTİR, elle yazılmamıştır. Değişmez şudur:
// DOLGU, kelimelerde geçen HER grapheme'i üretebilmeli. Aksi hâlde
// yalnızca kelimelerde bulunan bir harf, "bu hücre kesin bir kelimeye
// ait" ipucunu bedava verirdi. Türetme bunu yapısal olarak garantiler;
// tools/wordsearch-test.js her koşumda ayrıca doğruluyor.
// Korece/Çince/Devanagari'de zaten elle yazmak MÜMKÜN DEĞİL (11.172
// olası Hangul hece bloğu, binlerce Han karakteri, kelimeye göre
// değişen grapheme kümeleri).
//
// UZUNLUK KADEMELERİ dile göre: [3, 6], [3, 7], [4, 8], [4, 9], [4, 10]
// (5 zorluk kademesi; games.js paramsFor ile aynı sıra.)
'use strict';

WordPools.register('es', {
  upperLocale: 'es',
  len: [[3, 6], [3, 7], [4, 8], [4, 9], [4, 10]],
  alphabet: 'ABCDEFGHIJLMNOPQRSTUVXZ',
  fillerBag: 'ABCDEFGHIJLMNOPQRSTUVXZABCDEFGHIJLMNOPQRSTUVXZAEIOUAEORSTNL',
  words: [
    'AGUA', 'FUEGO', 'TIERRA', 'VIENTO', 'PIEDRA', 'RIO',
    'MAR', 'BOSQUE', 'MONTANA', 'VALLE', 'ISLA', 'DESIERTO',
    'NUBE', 'TORMENTA', 'TRUENO', 'NIEVE', 'HIELO', 'VERANO',
    'INVIERNO', 'OTONO', 'MANANA', 'NOCHE', 'SOMBRA', 'ESTRELLA',
    'LUNA', 'SOL', 'PLANETA', 'GALAXIA', 'CIELO', 'MANZANA',
    'PAN', 'QUESO', 'MIEL', 'AZUCAR', 'SAL', 'PIMIENTA',
    'CAFE', 'ZUMO', 'LECHE', 'SOPA', 'NARANJA', 'LIMON',
    'UVA', 'CEREZA', 'PLATANO', 'MELON', 'TOMATE', 'CEBOLLA',
    'AJO', 'ZANAHORIA', 'PATATA', 'ARROZ', 'PASTA', 'PASTEL',
    'GALLETA', 'CARAMELO', 'CABALLO', 'CAMELLO', 'TIGRE', 'LEON',
    'OSO', 'LOBO', 'ZORRO', 'CONEJO', 'RATON', 'AGUILA',
    'CUERVO', 'DELFIN', 'BALLENA', 'TIBURON', 'TORTUGA', 'SERPIENTE',
    'LAGARTO', 'ARANA', 'MARIPOSA', 'CASA', 'PUERTA', 'VENTANA',
    'TEJADO', 'JARDIN', 'PUENTE', 'TORRE', 'CASTILLO', 'MERCADO',
    'CALLE', 'MESA', 'SILLA', 'ESPEJO', 'ALFOMBRA', 'CORTINA',
    'ALMOHADA', 'MANTA', 'VELA', 'LAMPARA', 'CESTA', 'BOTELLA',
    'CUCHARA', 'PLATO', 'CUCHILLO', 'RELOJ', 'LLAVE', 'LIBRO',
    'PAPEL', 'LAPIZ', 'PINCEL', 'MUSICA', 'GUITARRA', 'PIANO',
    'TAMBOR', 'VIOLIN', 'CANCION', 'BAILE', 'TREN', 'AVION',
    'COHETE', 'BARCO', 'RUEDA', 'MOTOR', 'BILLETE', 'VIAJE',
    'MEDICO', 'MAESTRO', 'GRANJERO', 'PANADERO', 'PILOTO', 'MARINERO',
    'ARTISTA', 'AMIGO', 'FAMILIA', 'MADRE', 'PADRE', 'HERMANA',
    'HERMANO', 'CORAZON', 'SONRISA', 'SUENO', 'MEMORIA', 'SILENCIO',
  ],
});
