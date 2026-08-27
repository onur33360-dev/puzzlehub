// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · 한국어 (ko)
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
// UZUNLUK KADEMELERİ dile göre: [2, 3], [2, 4], [2, 4], [3, 5], [3, 5]
// (5 zorluk kademesi; games.js paramsFor ile aynı sıra.)
'use strict';

WordPools.register('ko', {
  upperLocale: null,
  len: [[2, 3], [2, 4], [2, 4], [3, 5], [3, 5]],
  alphabet: '가감개거겨계고곡과관구국귀그근금기까끼나낙녁노농늑늘니다당대도독돌둥등락람랑래레렌로름리린림마막머몬무묵문미바박뱀버베부북불붕비빠빵사상생선설성소쇠수숟스시아악양어억언얼여연열오올우울원유을음의이자장저접정제조족종주쥐즈지차창책천체추치친침커케켓퀴크타탄탕태터토튼파포폭풍프피필하행호화후',
  fillerBag: '가감개거겨계고곡과관구국귀그근금기까끼나낙녁노농늑늘니다당대도독돌둥등락람랑래레렌로름리린림마막머몬무묵문미바박뱀버베부북불붕비빠빵사상생선설성소쇠수숟스시아악양어억언얼여연열오올우울원유을음의이자장저접정제조족종주쥐즈지차창책천체추치친침커케켓퀴크타탄탕태터토튼파포폭풍프피필하행호화후가나다마바사아자차타파하거머버어저기니리미비시이지구무부수우주',
  words: [
    '바람', '바다', '계곡', '사막', '구름', '폭풍',
    '천둥', '얼음', '여름', '겨울', '가을', '아침',
    '저녁', '그림자', '태양', '행성', '하늘', '사과',
    '치즈', '버터', '설탕', '소금', '후추', '커피',
    '주스', '우유', '수프', '오렌지', '레몬', '포도',
    '체리', '바나나', '수박', '토마토', '양파', '마늘',
    '당근', '감자', '국수', '케이크', '과자', '사탕',
    '낙타', '호랑이', '사자', '늑대', '여우', '토끼',
    '생쥐', '독수리', '까마귀', '돌고래', '고래', '상어',
    '거북', '도마뱀', '거미', '나비', '창문', '지붕',
    '정원', '다리', '시장', '거리', '책상', '의자',
    '거울', '양탄자', '커튼', '베개', '이불', '등불',
    '바구니', '숟가락', '접시', '시계', '열쇠', '종이',
    '연필', '음악', '기타', '피아노', '바이올린', '노래',
    '무대', '기차', '비행기', '로켓', '바퀴', '기관',
    '여행', '의사', '선생', '농부', '제빵사', '조종사',
    '선원', '화가', '친구', '가족', '어머니', '아버지',
    '언니', '오빠', '마음', '미소', '기억', '침묵',
  ],
});
