// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Kelime Avı havuzu · 简体中文 (zh-Hans)
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
// UZUNLUK KADEMELERİ dile göre: [2, 3], [2, 3], [2, 4], [2, 4], [2, 4]
// (5 zorluk kademesi; games.js paramsFor ile aynı sıra.)
'use strict';

WordPools.register('zh-Hans', {
  upperLocale: null,
  len: [[2, 3], [2, 3], [2, 4], [2, 4], [2, 4]],
  sizeCap: 10,
  alphabet: '乌乐书云亮亲他光兔农冬冰刀勺包匙医卜友台吉员咖哥啡园土地场块城堡塔声夏夜大天太夫头奶姐子安家小屋山岛市师帘干庭引张影微心忆情想户房手提擎旅早时星春晚晨暴曲月朋本朵机条枕林果柠桃桌桥梁梦森椅樱橙檬歌母毯水汁汤沙河洋流海漠火灯烛熊父牛狐狮狸狼琴瓜瓶生画番白盐盘票秋空窗笑笔箭篮米糕糖纸老舞船花苹茄萄萝葡葱蒜蕉虎蛇蛋蛛蜂蜘蜜蜡蜥蜴蝴蝶蟒行街被西记谷豆豚蹈车轮道酪野钟钢钥铅镜门阳雪雷静面音顶风飞食饭饼香马驼骆骏高鱼鲨鲸鸦鹰黑鼓鼠龟',
  fillerBag: '乌乐书云亮亲他光兔农冬冰刀勺包匙医卜友台吉员咖哥啡园土地场块城堡塔声夏夜大天太夫头奶姐子安家小屋山岛市师帘干庭引张影微心忆情想户房手提擎旅早时星春晚晨暴曲月朋本朵机条枕林果柠桃桌桥梁梦森椅樱橙檬歌母毯水汁汤沙河洋流海漠火灯烛熊父牛狐狮狸狼琴瓜瓶生画番白盐盘票秋空窗笑笔箭篮米糕糖纸老舞船花苹茄萄萝葡葱蒜蕉虎蛇蛋蛛蜂蜘蜜蜡蜥蜴蝴蝶蟒行街被西记谷豆豚蹈车轮道酪野钟钢钥铅镜门阳雪雷静面音顶风飞食饭饼香马驼骆骏高鱼鲨鲸鸦鹰黑鼓鼠龟',
  words: [
    '河流', '海洋', '森林', '高山', '山谷', '海岛',
    '沙漠', '云朵', '暴风', '雷声', '白雪', '冰块',
    '夏天', '冬天', '春天', '秋天', '早晨', '夜晚',
    '影子', '阳光', '星星', '月亮', '太阳', '天空',
    '苹果', '面包', '奶酪', '蜂蜜', '白糖', '食盐',
    '咖啡', '果汁', '牛奶', '汤水', '橙子', '柠檬',
    '葡萄', '樱桃', '香蕉', '西瓜', '番茄', '洋葱',
    '大蒜', '萝卜', '土豆', '米饭', '面条', '蛋糕',
    '饼干', '糖果', '骏马', '骆驼', '老虎', '狮子',
    '黑熊', '野狼', '狐狸', '兔子', '老鼠', '老鹰',
    '乌鸦', '海豚', '鲸鱼', '鲨鱼', '乌龟', '蟒蛇',
    '蜥蜴', '蜘蛛', '蝴蝶', '房子', '大门', '窗户',
    '屋顶', '花园', '桥梁', '高塔', '城堡', '市场',
    '街道', '桌子', '椅子', '镜子', '地毯', '窗帘',
    '枕头', '被子', '蜡烛', '灯光', '篮子', '瓶子',
    '勺子', '盘子', '小刀', '时钟', '钥匙', '书本',
    '纸张', '铅笔', '画笔', '音乐', '吉他', '钢琴',
    '大鼓', '小提琴', '歌曲', '舞蹈', '舞台', '火车',
    '飞机', '火箭', '轮船', '车轮', '引擎', '车票',
    '旅行', '医生', '老师', '农夫', '面包师', '飞行员',
    '水手', '画家', '朋友', '家庭', '母亲', '父亲',
    '姐姐', '哥哥', '心情', '微笑', '梦想', '记忆',
    '安静',
  ],
});
