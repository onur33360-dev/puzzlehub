// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · Français (fr)
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

WordPools.register('fr', {
  upperLocale: 'fr',
  len: [[3, 6], [3, 7], [4, 8], [4, 9], [4, 10]],
  alphabet: 'ABCDEFGHIJLMNOPQRSTUVXYZ',
  fillerBag: 'ABCDEFGHIJLMNOPQRSTUVXYZABCDEFGHIJLMNOPQRSTUVXYZAEIOUAEIRSTNL',
  words: [
    'EAU', 'FEU', 'TERRE', 'VENT', 'PIERRE', 'FLEUVE',
    'MER', 'FORET', 'MONTAGNE', 'VALLEE', 'ILE', 'DESERT',
    'NUAGE', 'ORAGE', 'TONNERRE', 'NEIGE', 'GLACE', 'ETE',
    'HIVER', 'PRINTEMPS', 'AUTOMNE', 'MATIN', 'NUIT', 'OMBRE',
    'ETOILE', 'LUNE', 'SOLEIL', 'PLANETE', 'GALAXIE', 'CIEL',
    'POMME', 'PAIN', 'FROMAGE', 'BEURRE', 'MIEL', 'SUCRE',
    'SEL', 'POIVRE', 'CAFE', 'JUS', 'LAIT', 'SOUPE',
    'ORANGE', 'CITRON', 'RAISIN', 'CERISE', 'BANANE', 'MELON',
    'TOMATE', 'OIGNON', 'CAROTTE', 'RIZ', 'GATEAU', 'BISCUIT',
    'BONBON', 'CHEVAL', 'CHAMEAU', 'TIGRE', 'LION', 'OURS',
    'LOUP', 'RENARD', 'LAPIN', 'SOURIS', 'AIGLE', 'CORBEAU',
    'DAUPHIN', 'BALEINE', 'REQUIN', 'TORTUE', 'SERPENT', 'LEZARD',
    'ARAIGNEE', 'PAPILLON', 'MAISON', 'PORTE', 'FENETRE', 'TOIT',
    'JARDIN', 'PONT', 'TOUR', 'CHATEAU', 'MARCHE', 'RUE',
    'TABLE', 'CHAISE', 'MIROIR', 'TAPIS', 'RIDEAU', 'COUSSIN',
    'COUVERTURE', 'BOUGIE', 'LAMPE', 'PANIER', 'BOUTEILLE', 'CUILLERE',
    'ASSIETTE', 'COUTEAU', 'HORLOGE', 'CLEF', 'LIVRE', 'PAPIER',
    'CRAYON', 'PINCEAU', 'MUSIQUE', 'GUITARE', 'PIANO', 'TAMBOUR',
    'VIOLON', 'CHANSON', 'DANSE', 'SCENE', 'TRAIN', 'AVION',
    'FUSEE', 'BATEAU', 'ROUE', 'MOTEUR', 'BILLET', 'VOYAGE',
    'MEDECIN', 'MAITRE', 'FERMIER', 'BOULANGER', 'PILOTE', 'MARIN',
    'ARTISTE', 'AMI', 'FAMILLE', 'MERE', 'PERE', 'SOEUR',
    'FRERE', 'COEUR', 'SOURIRE', 'REVE', 'MEMOIRE', 'SILENCE',
  ],
});
