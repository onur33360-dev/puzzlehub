// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · Português (Brasil) (pt-BR)
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

WordPools.register('pt-BR', {
  upperLocale: 'pt',
  len: [[3, 6], [3, 7], [4, 8], [4, 9], [4, 10]],
  alphabet: 'ABCDEFGHIJLMNOPQRSTUVXZ',
  fillerBag: 'ABCDEFGHIJLMNOPQRSTUVXZABCDEFGHIJLMNOPQRSTUVXZAEIOUAEORSTNM',
  words: [
    'AGUA', 'FOGO', 'TERRA', 'VENTO', 'PEDRA', 'RIO',
    'MAR', 'FLORESTA', 'MONTANHA', 'VALE', 'ILHA', 'DESERTO',
    'NUVEM', 'TEMPESTADE', 'TROVAO', 'NEVE', 'GELO', 'VERAO',
    'INVERNO', 'OUTONO', 'MANHA', 'NOITE', 'SOMBRA', 'ESTRELA',
    'LUA', 'SOL', 'PLANETA', 'GALAXIA', 'CEU', 'MACA',
    'PAO', 'QUEIJO', 'MANTEIGA', 'MEL', 'ACUCAR', 'SAL',
    'PIMENTA', 'CAFE', 'SUCO', 'LEITE', 'SOPA', 'LARANJA',
    'LIMAO', 'UVA', 'CEREJA', 'BANANA', 'MELAO', 'TOMATE',
    'CEBOLA', 'ALHO', 'CENOURA', 'BATATA', 'ARROZ', 'MASSA',
    'BOLO', 'BISCOITO', 'DOCE', 'CAVALO', 'CAMELO', 'TIGRE',
    'LEAO', 'URSO', 'LOBO', 'RAPOSA', 'COELHO', 'RATO',
    'AGUIA', 'CORVO', 'GOLFINHO', 'BALEIA', 'TUBARAO', 'TARTARUGA',
    'COBRA', 'LAGARTO', 'ARANHA', 'BORBOLETA', 'CASA', 'PORTA',
    'JANELA', 'TELHADO', 'JARDIM', 'PONTE', 'TORRE', 'CASTELO',
    'MERCADO', 'RUA', 'MESA', 'CADEIRA', 'ESPELHO', 'TAPETE',
    'CORTINA', 'MANTA', 'VELA', 'LAMPADA', 'CESTA', 'GARRAFA',
    'COLHER', 'PRATO', 'FACA', 'RELOGIO', 'CHAVE', 'LIVRO',
    'PAPEL', 'LAPIS', 'PINCEL', 'MUSICA', 'VIOLAO', 'PIANO',
    'TAMBOR', 'VIOLINO', 'CANCAO', 'DANCA', 'TREM', 'AVIAO',
    'FOGUETE', 'BARCO', 'RODA', 'MOTOR', 'BILHETE', 'VIAGEM',
    'MEDICO', 'PROFESSOR', 'FAZENDEIRO', 'PADEIRO', 'PILOTO', 'MARINHEIRO',
    'ARTISTA', 'AMIGO', 'FAMILIA', 'MAE', 'PAI', 'IRMA',
    'IRMAO', 'CORACAO', 'SORRISO', 'SONHO', 'MEMORIA', 'SILENCIO',
  ],
});
