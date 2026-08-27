// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — Türkçe (tr)
// ═══════════════════════════════════════════════════════════════════════
//
// BU DOSYA MEVCUT METİNLERİN BİREBİR KOPYASI. Faz 4'ün tek şartı davranışın
// değişmemesiydi: uygulama daha önce ne yazıyorsa, aynısını yazmaya devam
// ediyor. Bir metni "daha iyi" yapmak istiyorsan bu ayrı bir karar, ayrı
// bir değişiklik.
//
// KANONİK ANAHTAR SETİ locales/en.js'tir. Buraya bir anahtar eklemeden önce
// oraya ekle; `node tools/i18n-test.js` iki dosyanın ayrışmasını yakalar.
//
// MARKA ADLARI ÇEVRİLMEZ: "SlySwipe", "SlySwipe Plus", "2048", "Sudoku".
// Oyun adlarında kural şu: AÇIKLAYICI ad çevrilir (Kelime Avı → Word Hunt),
// uluslararası/marka ad aynı kalır (2048, Sudoku, Flappy UFO).
'use strict';

I18n.register('tr', {

  // ── Uygulama ────────────────────────────────────────────────────────
  app_description: 'SlySwipe — Rahatlatıcı puzzle oyunları',

  // ── Ortak ───────────────────────────────────────────────────────────
  common_back: 'Geri',
  common_back_to_menu: 'Menüye Dön',
  common_close: 'Kapat',
  common_cancel: 'Vazgeç',
  common_see_all: 'Tümünü Gör',
  common_all: 'Tümü',
  common_play_again: '🔄 Tekrar Oyna',
  common_start: 'Başla',
  daily_replay: 'Tekrar Oyna',
  common_soon: 'Yakında',
  common_free: 'ücretsiz',
  common_level: 'Seviye',
  common_level_n: 'Seviye {n}',
  common_level_done: 'Seviye {n} Tamam!',
  common_bonus_plus: '+{n} bonus',
  common_score: 'Skor',
  common_best: 'En İyi',
  common_best_crown: '👑 En İyi',
  common_moves: 'Hamle',
  common_time: 'Süre',
  common_hint: 'İpucu',
  common_undo: 'Geri Al',
  common_reset: 'Sıfırla',
  common_restart: 'Yeniden Başlat',
  common_shuffle: 'Karıştır',
  common_earned: 'Kazanıldı',
  common_day_short: 'gün',
  common_seconds: '{n} sn',
  watersort_prev_level: 'Önceki Seviye',
  ad_budget_left: '📺 {left}/{limit} reklam hakkın kaldı',
  quest_shop_progress: '🎯 {done}/{total} görev tamamlandı',
  common_ad_short: 'reklam',
  arrow_settings: 'Ayarlar',
  watersort_extra_moves: '🧪 +{extra} hamle!',

  // Zorluk etiketleri — hem Keşfet kartı hem Sudoku seçicisi kullanıyor.
  // Sudoku beş kademeli; Keşfet kartı yalnızca ilk üçünü renklendiriyor
  // ama etiket beşi de yazabilmeli.
  difficulty_easy: 'Kolay',
  difficulty_medium: 'Orta',
  difficulty_hard: 'Zor',
  difficulty_expert: 'Uzman',
  difficulty_master: 'Usta',

  // ── Sekmeler ────────────────────────────────────────────────────────
  tab_home: 'Ana Sayfa',
  tab_discover: 'Keşfet',
  tab_badges: 'Rozetler',
  tab_profile: 'Profil',

  // ── Ana sayfa ───────────────────────────────────────────────────────
  home_hero_title: 'Keşfet <em>Akışı</em>',
  home_hero_desc: 'Mini oyun kartlarını kaydırarak keşfet.',
  home_hero_cta: 'Keşfete Git',
  home_daily_challenge: 'Günün Meydan Okuması',
  home_missions: 'Görevler',
  home_weekly_streak: 'Haftalık Seri',
  home_how_it_works: 'Nasıl Çalışır?',
  home_streak_info: '🔥 Her gün uygulamayı aç, seri büyüsün — bir gün kaçırırsan sıfırlanır.',
  home_weekly_reward_soon: '🎁 Haftalık ödül yakında!',
  home_no_favorites: 'Henüz favori oyunun yok',
  home_favorites_cta: "Keşfet'e git ve ❤️ ile favorile →",
  home_favorites_empty_cta: "❤️ Keşfet'ten favorilerine ekle →",
  home_promo_plus_title: 'PLUS Avantajları',
  home_promo_plus_desc: 'Reklamsız deneyim ve her gün +20💎',

  // Özet kartlar
  home_stat_badges: 'Rozet İlerlemesi',
  home_stat_quest: 'Aktif Görev',
  home_stat_quest_active: '{n} aktif',
  home_stat_streak: 'Seri',
  stat_games_won: 'Kazanılan',
  stat_games_played: 'Oynanan Tur',
  home_stat_level: 'Seviye',

  // ── Profil ──────────────────────────────────────────────────────────
  profile_title: 'Profil',
  profile_subtitle: 'Hesabın, tercihlerin ve koleksiyonun',
  profile_default_name: 'Oyuncu',
  profile_showcase: 'Vitrindeki Rozetler',
  profile_favorites: 'Favori Oyunlar',
  profile_pill_streak: '{n} gün seri',
  profile_pill_badges: '{n}/{total} rozet',

  // ── Ayarlar ─────────────────────────────────────────────────────────
  settings_group_account: 'Hesap',
  settings_group_premium: 'Premium ve Elmas',
  settings_group_prefs: 'Tercihler',
  settings_group_support: 'Destek',
  settings_group_privacy: 'Gizlilik',

  settings_avatar: 'Avatarını Düzenle',
  settings_avatar_note: 'Profilinde görünen karakter',
  settings_frame: 'Profil Çerçevesi',
  settings_frame_toast: 'Profil çerçeveleri yakında!',
  settings_restore: 'Satın Almaları Geri Yükle',
  settings_restore_note: 'Aboneliğini yeni cihaza taşı',
  settings_plus: "Plus'a Geç",
  settings_plus_note: 'Reklamsız deneyim, her gün +20💎',
  settings_shop: 'Elmas Mağazası',
  settings_shop_note: 'Paket satın al veya ücretsiz kazan',
  settings_theme: 'Tema',
  settings_sound: 'Ses Efektleri',
  settings_notifications: 'Bildirimler',
  settings_notifications_toast: 'Bildirimler yakında!',
  settings_help: 'Yardım',
  settings_rate: 'Puanla',
  settings_share: 'Paylaş',
  // ── Paylaş / Puanla / Yardım (2026-08-19) ──
  share_text: 'SlySwipe oynuyorum — rahatlatıcı bulmaca ve arcade oyunları tek uygulamada. Sen de dene: {url}',
  share_copied: '🔗 Bağlantı kopyalandı',
  share_failed: 'Paylaşım açılamadı',
  share_dialog_title: 'SlySwipe\'ı paylaş',
  rate_failed: 'Play Store açılamadı',
  help_title: 'Yardım',
  help_start_title: 'Nasıl başlanır?',
  help_start_body: 'Ana Sayfa\'dan ya da Keşfet\'ten bir oyun seç ve oyna. Seviyen ve skorun kendiliğinden kaydedilir — hesap açmana gerek yok.',
  help_discover_title: 'Keşfet nasıl çalışır?',
  help_discover_body: 'Oyun kartlarını yukarı aşağı kaydır. Her oyun düzenli olarak karşına çıkar; kalbe dokunduğunda favorilerine eklenir.',
  help_games_title: 'Oyunlar',
  help_games_body: '11 oyun: 9 bulmaca, 2 arcade. Her biri kendi seviyesini ve en iyi skorunu tutar. Yeni oyunlar düzenli ekleniyor.',
  help_ads_title: 'Reklamlar ve ödüller',
  help_ads_body: 'Reklam izlemek her zaman senin tercihin — karşılığında ipucu, devam hakkı ya da elmas alırsın. Günlük sınır yalnızca ücretsiz elmasta.',
  help_plus_title: 'SlySwipe Plus',
  help_plus_body: 'Plus reklamları kaldırır, devam etmeyi ücretsiz yapar, her gün +20 elmas ve ödüllerde +%50 verir. İstediğin zaman iptal edebilirsin.',
  help_purchase_title: 'Satın alma ve geri yükleme',
  help_purchase_body: 'Satın almalar Google Play üzerinden yapılır. Cihaz değiştirdiysen ya da uygulamayı sildiysen Ayarlar\'daki "Satın Almaları Geri Yükle" satırını kullan.',
  help_privacy_title: 'Gizlilik',
  help_privacy_body: 'Reklamlar için reklam kimliği kullanıyoruz. AB\'deysen tercihini Gizlilik Seçenekleri satırından istediğin zaman değiştirebilirsin.',
  help_privacy_link: 'Gizlilik Politikası',
  help_support_title: 'Destek',
  help_support_body: 'Bir şey bozuksa ya da kendi dilinde yanlış duran bir kelime gördüysen bize yaz — hangi dil ve ne gördüğünü belirt.',
  settings_about: 'Hakkında',
  settings_privacy_options: 'Gizlilik Seçenekleri',
  settings_privacy_options_note: 'Reklam kişiselleştirme tercihini değiştir',
  settings_privacy_unavailable: 'Bu cihazda kullanılamıyor',
  settings_privacy_failed: 'Gizlilik formu açılamadı',

  // Dil seçici (YENİ — 2026-08-15)
  settings_language: 'Dil',
  settings_language_title: 'Dil Seç',
  settings_language_system: 'Sistem Varsayılanı',
  settings_language_system_note: 'Cihazının dilini kullan',

  // ── Temalar ─────────────────────────────────────────────────────────
  theme_night_violet: 'Gece Menekşesi',
  theme_shadow_temple: 'Gölge Tapınak',
  theme_plus_only: '👑 Bu tema Plus üyeliğe özel',
  theme_soon: '🎨 Bu tema yakında',

  // ── Avatar ──────────────────────────────────────────────────────────
  avatar_picker_title: 'Avatarını Seç',

  // ── Plus ────────────────────────────────────────────────────────────
  plus_benefit_noads_title: 'Reklamsız Deneyim',
  plus_benefit_noads_desc: 'Ödüller reklamsız ve günlük limitsiz',
  plus_benefit_continue_title: 'Sınırsız Devam Hakkı',
  plus_benefit_continue_desc: 'Ne elmas harcarsın ne reklam izlersin',
  plus_benefit_daily_title: 'Her Gün +20 Elmas',
  plus_benefit_daily_desc: 'Günlük ödülün üstüne, her gün',
  plus_benefit_bonus_title: '+%50 Elmas Bonusu',
  plus_benefit_bonus_desc: 'Reklam ve günlük ödül kazançlarında',
  plus_benefit_themes_title: 'Özel Temalar',
  plus_benefit_themes_desc: "Plus'a özel tema koleksiyonu — yakında",
  plus_benefit_badge_title: 'Profil Rozeti',
  plus_benefit_badge_desc: '⭐ Plus rozeti profilinde',
  plus_plan_best: '🏆 EN İYİ!',
  plus_plan_yearly: 'Yıllık',
  plus_plan_monthly: 'Aylık',
  plus_plan_weekly: 'Haftalık',
  plus_period_year: '/yıl',
  plus_period_month: '/ay',
  plus_period_week: '/hafta',
  plus_cta: "⭐ PLUS'A GEÇ",
  plus_disclaimer: 'İstediğin zaman iptal et • 7 gün ücretsiz dene',
  plus_already: '⭐ Zaten Plus üyesisin!',
  plus_active: '👑 Plus aktif — iyi oyunlar!',
  plus_plan_failed: '🛒 Plan seçilemedi',
  // "aylık X, yıllıkta %Y tasarruf" — iki fiyattan TÜRETİLİYOR, yazılmıyor.
  plus_savings: '{perMonth}/ay · %{percent} tasarruf',

  // ── Mağaza / satın alma ─────────────────────────────────────────────
  shop_title: '💎 Elmas Mağazası',
  shop_balance_label: 'mevcut elmasın',
  shop_section_buy: '💰 SATIN AL',
  shop_section_free: '🎁 ÜCRETSIZ KAZAN',
  shop_tag_popular: 'Popüler',
  shop_tag_best: 'En İyi! ⭐',
  shop_free_ad: 'Reklam İzle',
  shop_free_ad_note: '{amount} Elmas Kazan!',
  shop_free_quests: 'Günlük Görevler',
  shop_free_daily: 'Günlük Ödül',
  shop_free_daily_note: 'Her gün giriş yap',
  shop_free_badges: 'Başarımlar',
  shop_pkg_not_found: '🛒 Paket bulunamadı',
  purchase_done: 'Satın alma tamamlandı!',
  purchase_app_only: '🛒 Satın alma yalnızca uygulamada kullanılabilir',
  purchase_not_found: '🛒 Ürün şu an mağazada bulunamadı',
  purchase_failed: '🛒 Satın alma tamamlanamadı, sonra tekrar dene',
  purchase_restoring: '🔄 Satın almalar geri yükleniyor…',
  purchase_restored_plus: '👑 Plus üyeliğin geri yüklendi!',
  purchase_restore_none: 'ℹ️ Geri yüklenecek bir satın alma bulunamadı',
  purchase_restore_failed: '🔄 Geri yükleme başarısız, sonra tekrar dene',

  // ── Elmas ───────────────────────────────────────────────────────────
  diamonds_not_enough: '💎 Yeterli elmas yok!',
  diamonds_plus_bonus: ' (Plus +%50)',
  diamonds_daily_reward: 'Günlük ödül!',
  diamonds_plus_daily: 'Plus günlük bonusu 👑',
  diamonds_already_claimed: '✅ Bugünkü ödülü zaten aldın!',
  diamonds_reward_label: '{amount} Elmas',
  diamonds_reward_label_big: '{amount} Elmas!',

  // ── Reklam ──────────────────────────────────────────────────────────
  ad_watch: 'Reklam İzle',
  ad_reward_title: '📺 Ödüllü Video',
  ad_reward_sim: 'Reklam simülasyonu: 3 saniye',
  ad_interstitial_title: '📺 Reklam',
  ad_interstitial_sim: 'Geçiş reklamı simülasyonu',
  ad_interstitial_wait: '2 saniye sonra kapatılabilir',
  ad_close: 'Kapat ✕',
  ad_load_failed: '📺 Reklam şu an yüklenemedi, sonra tekrar dene',
  ad_must_finish: '📺 Ödül için reklamı sonuna kadar izlemelisin',
  ad_blocked_consent: '📺 Reklam gösterilemiyor — gizlilik tercihlerini Profil’den değiştirebilirsin',
  ad_daily_limit: '📺 Bugünkü elmas hakkın bitti — yarın tekrar gel!',
  ad_budget_plus: '👑 Plus: sınırsız',
  ad_budget_empty: '📺 Yarın tekrar gel',
  ad_reward_toast: 'Reklam ödülü!',
  ad_loading: '⏳ Reklam yükleniyor…',
  offer_help: 'Yardım',
  offer_reward: 'Ödül',
  offer_balance: 'Bakiyen: 💎 {amount}',

  // ── Günlük görevler ─────────────────────────────────────────────────
  quest_play_3: '3 oyun oyna',
  quest_win_1: '1 oyun kazan',
  quest_daily_challenge: 'Günlük meydan okumayı tamamla',
  quest_toast: 'Görev: {name}',
  quest_all_done: 'Tüm günlük görevler! 🎉',
  quest_done_today: '✅ Bugün tamamlandı',

  weekly_login7_name: '7 Gün Giriş',
  weekly_login7_desc: '7 gün üst üste gir',
  weekly_win15_name: '15 Oyun Kazan',
  weekly_win15_desc: '15 oyun kazanma',
  weekly_variety_name: 'Her Kategoriden 1',
  weekly_variety_desc: 'Her kategoriden oyna',

  // ── Rozetler ────────────────────────────────────────────────────────
  badges_screen_title: 'Rozetler',
  badges_screen_sub: 'Koleksiyonun ve ilerlemen',
  badges_collections: 'Koleksiyonlar',
  badges_earned_kicker: 'Rozet Kazanıldı',
  badges_all_earned: '🏆 Tüm rozetler kazanıldı',
  badges_shop_progress: '🏆 {n}/{total} rozet kazanıldı',
  badges_none_yet: 'Henüz rozet yok',
  badges_total_reward: '💎 {amount} toplam ödül',
  badges_collection_pct: 'Koleksiyon %{pct}',
  badges_first_title: 'İlk rozetini kazan',
  badges_first_desc: 'Bir oyun başlat, hemen açılır',
  badges_all_done_title: 'Tüm rozetleri topladın. Yeni rozetler yolda.',
  badges_all_done_desc: 'Görevleri tamamla, serini sürdür ve elmas kazan — rozetler kendiliğinden açılır.',
  badges_earned_today: 'Bugün kazandın',
  badges_earned_days_ago_one: '1 gün önce kazandın',
  badges_earned_days_ago_other: '{n} gün önce kazandın',

  badges_last_earned: 'Son Rozetin',
  badge_group_games: 'Oyun',
  badge_group_streak: 'Seri',
  badge_group_economy: 'Ekonomi',

  badge_first_game: 'İlk Oyun',
  badge_first_game_desc: 'İlk oyununu başlat',
  badge_ten_games: '10 Oyun',
  badge_ten_games_desc: '10 oyun oyna',
  badge_streak_7: '7 Gün Seri',
  badge_streak_7_desc: '7 gün üst üste giriş yap',
  badge_streak_30: '30 Gün Seri',
  badge_streak_30_desc: '30 gün üst üste giriş yap',
  badge_streak_50: '50 Gün Seri',
  badge_streak_50_desc: '50 gün üst üste giriş yap',
  badge_streak_100: '100 Gün Seri',
  badge_streak_100_desc: '100 gün üst üste giriş yap',
  badge_streak_250: '250 Gün Seri',
  badge_streak_250_desc: '250 gün üst üste giriş yap',
  badge_streak_500: '500 Gün Seri',
  badge_streak_500_desc: '500 gün üst üste giriş yap',
  badge_diamonds_500: '500 Elmas',
  badge_diamonds_500_desc: 'Toplam 500💎 kazan',

  // ── Seri ────────────────────────────────────────────────────────────
  streak_milestone_7: '7 gün seri bonusu! 🔥',
  streak_milestone_14: '14 gün seri! 🎉',
  streak_milestone_30: '30 gün seri! 👑',
  day_mon: 'Pzt', day_tue: 'Sal', day_wed: 'Çar', day_thu: 'Per',
  day_fri: 'Cum', day_sat: 'Cmt', day_sun: 'Paz',

  // ── Gezinme ─────────────────────────────────────────────────────────
  nav_back_exit: "↩︎ Çıkmak için tekrar geri'ye basın",
  game_soon: '🎮 {name} — yakında!',

  // ── Keşfet ──────────────────────────────────────────────────────────
  discover_swipe_hint: 'Kaydır',
  discover_open_full: '▶  TAM OYUNU AÇ',
  discover_play: '▶  OYNA',
  discover_locked: '🔒  YAKINDA',
  discover_soon: 'Yakında!',
  discover_favorited: '❤️ Favorilere eklendi',
  discover_best: '🏆 En Yüksek: {score}',
  discover_unfavorited: '💔 Favorilerden çıkarıldı',
  discover_chip_favorites: 'Favoriler',
  discover_fav_label: 'Favori',
  discover_chip_puzzle: 'Bulmaca',
  discover_chip_arcade: 'Arcade',

  // Kart üstü oynanış ipuçları
  demo_hint_wordsearch: 'ÇAPRAZ DA SÜRÜKLE',
  demo_hint_flow: 'PARMAĞINLA BAĞLA',
  demo_hint_watersort: 'AYNI RENKLERİ BİRLEŞTİR',
  demo_solved: 'ÇÖZDÜN!',

  // ── Oyun adları ─────────────────────────────────────────────────────
  // 2048 / Sudoku / Flappy UFO ÇEVRİLMİYOR: uluslararası adlar.
  game_name_blockPuzzle: 'Bulmaca Blokları',
  game_name_game2048: '2048',
  game_name_memoryGame: 'Hafıza Oyunu',
  game_name_wordSearch: 'Kelime Avı',
  game_name_sudoku: 'Sudoku',
  game_name_waterSort: 'İksir Sıralama',
  game_name_arrowPuzzle: 'Ok Bulmaca',
  game_name_flowConnect: 'Akış Bağlantı',
  game_name_jigsawCard: 'Resim Kaydır',
  game_name_snakeGame: 'Yılan',
  game_name_flappyUfo: 'Flappy UFO',

  game_desc_blockPuzzle: 'Blokları yerleştir, satırları temizle!',
  game_desc_game2048: 'Kaydır, birleştir, 2048\'e ulaş!',
  game_desc_memoryGame: 'Kartları eşleştir, hafızanı test et!',
  game_desc_wordSearch: 'Parmağınla sürükle, kelimeyi bul!',
  game_desc_sudoku: '9x9 tabloyu doldur!',
  game_desc_waterSort: 'İksirleri sırala, renkleri ayır!',
  game_desc_arrowPuzzle: 'Enerji kanallarını doğru sırayla boşalt!',
  game_desc_flowConnect: 'Renkleri bağla, tahtayı doldur!',
  game_desc_jigsawCard: 'Fotoğrafı kaydırarak tamamla!',
  game_desc_snakeGame: 'Klasik yılan — elmasları topla, uza!',
  game_desc_flappyUfo: 'Dokun, yüksel, geçitlerden süz!',

  // Ana sayfa kısa açıklamaları (Keşfet'tekinden farklı, daha kısa)
  game_tag_game2048: 'Sayı birleştir',
  game_tag_blockPuzzle: 'Blok yerleştir',
  game_tag_memoryGame: 'Kartları eşleştir',
  game_tag_jigsawCard: 'Fotoğrafı kaydır, tamamla',
  game_tag_snakeGame: 'Klasik yılan — elmasları topla',
  game_tag_flappyUfo: 'Dokun, yüksel, geçitlerden süz',
  game_tag_flowConnect: 'Renkleri bağla, tahtayı doldur',

  // ── Oyun kabuğu / oyun sonu ─────────────────────────────────────────
  game_default_title: 'Oyun',
  game_score: 'SKOR',
  tooltip_music: 'Müzik',
  tooltip_sound: 'Ses',
  game_level_done: 'Level tamamlandı!',
  go_continue_plus: 'Devam Et (Plus)',
  go_continue_ad: 'Reklam İzle → Devam Et',
  go_continue_diamonds: '{cost} Elmas → Devam Et',
  go_double_plus: 'Skor 2x (Plus)',
  go_double_ad: 'Reklam İzle → Skor 2x!',
  go_continue_title: 'Devam Et!',
  go_continuing: '🔄 Devam ediyorsun!',
  go_continue_free_plus: '👑 Plus: devam ücretsiz!',
  go_continue_spent: '{cost} elmas harcandı — devam!',
  go_double_title: 'Skor 2x!',
  go_double_done: '🎉 Skor 2 katına çıktı!',

  // ── 2048 ────────────────────────────────────────────────────────────
  g2048_undo: 'Geri Alma',
  g2048_undo_ad: 'Reklam İzle → +1',
  g2048_undo_plus: '+1 Geri Alma',
  g2048_undo_title: 'Geri al',
  g2048_over_title: 'Hamle Kalmadı',
  g2048_over_msg: 'En yüksek karo: {tile}',

  // ── Hafıza ──────────────────────────────────────────────────────────
  memory_matches: 'Eşleşme',
  memory_moves: 'Hamle',
  memory_done_title: 'Eşleştirme Tamamlandı',
  memory_done_msg: 'Tüm kartları eşledin.',

  // ── Kelime Avı ──────────────────────────────────────────────────────
  wordsearch_hud_level: 'SEVİYE',
  wordsearch_hud_words: 'KELİME',

  // ── Sudoku ──────────────────────────────────────────────────────────
  sudoku_daily_badge: 'Günlük',
  sudoku_over_title: 'Büyü Tükendi',
  sudoku_over_msg: 'Canların tükendi.',
  sudoku_win_title: 'Sudoku Çözüldü',
  sudoku_win_msg: 'Tabloyu tamamladın.',
  sudoku_daily_title: 'Günlük Tamamlandı',
  sudoku_daily_msg: 'Bugünün bulmacasını çözdün.',
  sudoku_filled: 'Dolu',
  sudoku_remaining: 'Kalan',
  sudoku_streak: 'Seri',

  // ── Blok Bulmaca ────────────────────────────────────────────────────
  block_over_title: 'Yer Kalmadı',
  block_over_msg: 'Sığacak blok kalmadı.',
  block_combo: 'SERİ x{n}',
  block_praise_1: 'Güzel!',
  block_praise_2: 'Harika!',
  block_praise_3: 'Muhteşem!',
  block_praise_4: 'İnanılmaz!',
  block_praise_5: 'EFSANE!',

  // ── İksir Sıralama ──────────────────────────────────────────────────
  watersort_prev_level_ad: 'Önceki Seviye (reklam)',
  watersort_restart_ad: 'Yeniden Başlat (reklam)',
  watersort_over_title: 'Hamleler Bitti',
  watersort_over_msg: '+{extra} hamle ile devam edebilirsin.',
  watersort_tubes_done: 'Biten Tüp',

  // ── Ok Bulmaca ──────────────────────────────────────────────────────
  arrow_over_title: 'Enerji Tükendi',
  arrow_over_msg: 'Kanallar söndü. Reklam izleyip devam edebilir ya da seviyeyi baştan alabilirsin.',
  arrow_no_free: '✨ Şu an serbest ok yok',
  arrow_hint_ad: 'Reklam İzle → İpucu',
  arrow_sound_on: 'Ses Açık',
  arrow_sound_off: 'Ses Kapalı',
  arrow_zoom_in: 'Yakınlaş',
  arrow_zoom_out: 'Uzaklaş',
  arrow_zoom_slider: 'Yakınlaştır',
  arrow_remaining: 'Kalan',
  arrow_grid: 'Izgara',

  // ── Yılan ───────────────────────────────────────────────────────────
  snake_over_title: 'Yılan Öldü',
  snake_over_msg: 'Kendine çarptın. Uzunluk: {length}',
  snake_win_title: 'Tahta Doldu!',
  snake_win_msg: 'Yılan bütün tahtayı kapladı.',
  snake_resume: '🐍 Yön seç ve devam et',

  // ── Flappy UFO ──────────────────────────────────────────────────────
  flappy_over_title: 'Düştün!',
  flappy_over_msg_one: '1 geçit geçtin.',
  flappy_over_msg_other: '{n} geçit geçtin.',
  flappy_resume: '🛸 Dokun ve devam et',
  flappy_best: 'EN İYİ: {score}',
  flappy_best_label: 'EN İYİ SKOR',
  flappy_tap_continue: 'Devam etmek için dokun',
  flappy_tap_rise: 'Yükselmek için dokun',

  // ── Akış Bağlantı ───────────────────────────────────────────────────
  flow_hint_ad: 'Reklam İzle → İpucu',
  flow_all_connected: '✨ Zaten hepsi bağlı',
  flow_no_hint: '💡 Bu tahtada ipucu yok',
  flow_level_points: '{points} puan',
  flow_gen_failed: '⚠️ Seviye üretilemedi',

  // ── Resim Kaydır ────────────────────────────────────────────────────
});
