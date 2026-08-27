// ═══════════════════════════════════════════════════════════════════════
//  SlySwipe — English (en)  ·  KANONİK ANAHTAR SETİ
// ═══════════════════════════════════════════════════════════════════════
//
// BU DOSYA REFERANSTIR. Diğer 14 dil buradaki anahtar setine göre
// denetleniyor (`node tools/i18n-test.js`): burada olmayan bir anahtar
// "fazla", burada olup ötekinde olmayan "eksik" sayılır.
//
// AYRICA GARANTİLİ YEDEK: I18n her açılışta bunu yükler ve eksik bir
// anahtar önce buraya düşer. Bu yüzden `en` ASLA eksik olamaz — bir
// anahtarı buradan silmek, onu tüm dillerde silmek demektir.
//
// ÇEVİRİ TONU: kısa, aksiyon odaklı mobil arayüz dili. Birebir çeviri
// değil — "Tekrar Oyna" İngilizce'de "Play Again"dir, "Repeat Game" değil.
//
// OYUN ADLARI: açıklayıcı olanlar çevrildi (Kelime Avı → Word Hunt),
// uluslararası/marka olanlar aynı kaldı (2048, Sudoku, Flappy UFO).
// Marka adları hiçbir dilde çevrilmez: SlySwipe, SlySwipe Plus.
'use strict';

I18n.register('en', {

  // ── App ─────────────────────────────────────────────────────────────
  app_description: 'SlySwipe — relaxing puzzle games',

  // ── Common ──────────────────────────────────────────────────────────
  common_back: 'Back',
  common_back_to_menu: 'Back to Menu',
  common_close: 'Close',
  common_cancel: 'Cancel',
  common_see_all: 'See All',
  common_all: 'All',
  common_play_again: '🔄 Play Again',
  common_start: 'Start',
  daily_replay: 'Play Again',
  common_soon: 'Soon',
  common_free: 'free',
  common_level: 'Level',
  // Numaralı biçim AYRI anahtar: bazı dillerde sayı başa geçer
  // (ja "レベル{n}" değil "{n}レベル" olabilir) — "Level" + " " + n
  // birleştirmesi bu sırayı dayatırdı.
  common_level_n: 'Level {n}',
  common_level_done: 'Level {n} Done!',
  common_bonus_plus: '+{n} bonus',
  common_score: 'Score',
  common_best: 'Best',
  common_best_crown: '👑 Best',
  common_moves: 'Moves',
  common_time: 'Time',
  common_hint: 'Hint',
  common_undo: 'Undo',
  common_reset: 'Reset',
  common_restart: 'Restart',
  common_shuffle: 'Shuffle',
  common_earned: 'Earned',
  common_day_short: 'days',
  // Kısa birim: rakamla bitişik okunur, "12s" gibi. Çeviride boşluk
  // kuralı dile göre değişir (fr "12 s"), o yüzden yer tutucu dahil.
  common_seconds: '{n}s',
  watersort_prev_level: 'Previous Level',
  ad_budget_left: '📺 {left}/{limit} ad rewards left',
  quest_shop_progress: '🎯 {done}/{total} quests done',
  common_ad_short: 'ad',
  arrow_settings: 'Settings',
  watersort_extra_moves: '🧪 +{extra} moves!',

  difficulty_easy: 'Easy',
  difficulty_medium: 'Medium',
  difficulty_hard: 'Hard',
  difficulty_expert: 'Expert',
  difficulty_master: 'Master',

  // ── Tabs ────────────────────────────────────────────────────────────
  tab_home: 'Home',
  tab_discover: 'Discover',
  tab_badges: 'Badges',
  tab_profile: 'Profile',

  // ── Home ────────────────────────────────────────────────────────────
  home_hero_title: 'Discover <em>Feed</em>',
  home_hero_desc: 'Swipe through mini game cards to find your next favorite.',
  home_hero_cta: 'Go to Discover',
  home_daily_challenge: "Today's Challenge",
  home_missions: 'Quests',
  home_weekly_streak: 'Weekly Streak',
  home_how_it_works: 'How It Works',
  home_streak_info: '🔥 Open the app every day to grow your streak — miss a day and it resets.',
  home_weekly_reward_soon: '🎁 Weekly reward coming soon!',
  home_no_favorites: 'No favorite games yet',
  home_favorites_cta: 'Go to Discover and tap ❤️ to add favorites →',
  home_favorites_empty_cta: '❤️ Add favorites from Discover →',
  home_promo_plus_title: 'PLUS Benefits',
  home_promo_plus_desc: 'Ad-free play and +20💎 every day',

  home_stat_badges: 'Badge Progress',
  home_stat_quest: 'Active Quest',
  home_stat_quest_active: '{n} active',
  home_stat_streak: 'Streak',
  stat_games_won: 'Wins',
  stat_games_played: 'Rounds Played',
  home_stat_level: 'Level',

  // ── Profile ─────────────────────────────────────────────────────────
  profile_title: 'Profile',
  profile_subtitle: 'Your account, preferences and collection',
  profile_default_name: 'Player',
  profile_showcase: 'Featured Badges',
  profile_favorites: 'Favorite Games',
  profile_pill_streak: '{n} day streak',
  profile_pill_badges: '{n}/{total} badges',

  // ── Settings ────────────────────────────────────────────────────────
  settings_group_account: 'Account',
  settings_group_premium: 'Premium & Diamonds',
  settings_group_prefs: 'Preferences',
  settings_group_support: 'Support',
  settings_group_privacy: 'Privacy',

  settings_avatar: 'Edit Avatar',
  settings_avatar_note: 'The character shown on your profile',
  settings_frame: 'Profile Frame',
  settings_frame_toast: 'Profile frames coming soon!',
  settings_restore: 'Restore Purchases',
  settings_restore_note: 'Move your subscription to a new device',
  settings_plus: 'Get Plus',
  settings_plus_note: 'Ad-free play, +20💎 every day',
  settings_shop: 'Diamond Shop',
  settings_shop_note: 'Buy a pack or earn for free',
  settings_theme: 'Theme',
  settings_sound: 'Sound Effects',
  settings_notifications: 'Notifications',
  settings_notifications_toast: 'Notifications coming soon!',
  settings_help: 'Help',
  settings_rate: 'Rate Us',
  settings_share: 'Share',
  // ── Paylaş / Puanla / Yardım (2026-08-19) ──
  share_text: 'I\'m playing SlySwipe — relaxing puzzle and arcade games in one app. Try it: {url}',
  share_copied: '🔗 Link copied',
  share_failed: 'Couldn\'t open sharing',
  share_dialog_title: 'Share SlySwipe',
  rate_failed: 'Couldn\'t open the Play Store',
  help_title: 'Help',
  help_start_title: 'Getting started',
  help_start_body: 'Pick a game from Home or Discover and just play. Your level and score are saved automatically — no account needed.',
  help_discover_title: 'How Discover works',
  help_discover_body: 'Swipe up and down through game cards. Every game shows up regularly, and tapping the heart adds it to your favorites.',
  help_games_title: 'Games',
  help_games_body: '11 games: 9 puzzles and 2 arcade titles. Each one keeps its own level and best score. New games are added regularly.',
  help_ads_title: 'Ads and rewards',
  help_ads_body: 'Watching an ad is always your choice — it buys a hint, a continue or free diamonds. There\'s a daily cap on free diamonds only.',
  help_plus_title: 'SlySwipe Plus',
  help_plus_body: 'Plus removes ads, makes continues free, adds +20 diamonds a day and +50% on rewards. Cancel anytime.',
  help_purchase_title: 'Purchases and restore',
  help_purchase_body: 'Purchases go through Google Play. Switched devices or reinstalled? Use "Restore Purchases" in Settings.',
  help_privacy_title: 'Privacy',
  help_privacy_body: 'We use an advertising ID for ads. In the EU you can change your choice anytime from the Privacy Options row.',
  help_privacy_link: 'Privacy Policy',
  help_support_title: 'Support',
  help_support_body: 'Something broken, or a word that looks wrong in your language? Write to us — tell us your language and what you saw.',
  settings_about: 'About',
  settings_privacy_options: 'Privacy Options',
  settings_privacy_options_note: 'Change your ad personalization choice',
  settings_privacy_unavailable: 'Not available on this device',
  settings_privacy_failed: "Couldn't open the privacy form",

  settings_language: 'Language',
  settings_language_title: 'Choose Language',
  settings_language_system: 'System Default',
  settings_language_system_note: "Use your device's language",

  // ── Themes ──────────────────────────────────────────────────────────
  theme_night_violet: 'Night Violet',
  theme_shadow_temple: 'Shadow Temple',
  theme_plus_only: '👑 This theme is Plus only',
  theme_soon: '🎨 This theme is coming soon',

  // ── Avatar ──────────────────────────────────────────────────────────
  avatar_picker_title: 'Choose Your Avatar',

  // ── Plus ────────────────────────────────────────────────────────────
  plus_benefit_noads_title: 'Ad-Free Play',
  plus_benefit_noads_desc: 'Rewards without ads, no daily limit',
  plus_benefit_continue_title: 'Unlimited Continues',
  plus_benefit_continue_desc: 'No diamonds spent, no ads watched',
  plus_benefit_daily_title: '+20 Diamonds Daily',
  plus_benefit_daily_desc: 'On top of your daily reward, every day',
  plus_benefit_bonus_title: '+50% Diamond Bonus',
  plus_benefit_bonus_desc: 'On ad and daily reward earnings',
  plus_benefit_themes_title: 'Exclusive Themes',
  plus_benefit_themes_desc: 'A Plus-only theme collection — coming soon',
  plus_benefit_badge_title: 'Profile Badge',
  plus_benefit_badge_desc: '⭐ A Plus badge on your profile',
  plus_plan_best: '🏆 BEST VALUE!',
  plus_plan_yearly: 'Yearly',
  plus_plan_monthly: 'Monthly',
  plus_plan_weekly: 'Weekly',
  plus_period_year: '/yr',
  plus_period_month: '/mo',
  plus_period_week: '/wk',
  plus_cta: '⭐ GET PLUS',
  plus_disclaimer: 'Cancel anytime • 7-day free trial',
  plus_already: "⭐ You're already a Plus member!",
  plus_active: '👑 Plus active — have fun!',
  plus_plan_failed: "🛒 Couldn't select a plan",
  plus_savings: '{perMonth}/mo · save {percent}%',

  // ── Shop / purchase ─────────────────────────────────────────────────
  shop_title: '💎 Diamond Shop',
  shop_balance_label: 'diamonds available',
  shop_section_buy: '💰 BUY',
  shop_section_free: '🎁 EARN FREE',
  shop_tag_popular: 'Popular',
  shop_tag_best: 'Best Value! ⭐',
  shop_free_ad: 'Watch an Ad',
  shop_free_ad_note: 'Earn {amount} Diamonds!',
  shop_free_quests: 'Daily Quests',
  shop_free_daily: 'Daily Reward',
  shop_free_daily_note: 'Check in every day',
  shop_free_badges: 'Achievements',
  shop_pkg_not_found: '🛒 Pack not found',
  purchase_done: 'Purchase complete!',
  purchase_app_only: '🛒 Purchases are only available in the app',
  purchase_not_found: '🛒 That item is not in the store right now',
  purchase_failed: "🛒 Purchase didn't go through, try again later",
  purchase_restoring: '🔄 Restoring purchases…',
  purchase_restored_plus: '👑 Your Plus membership is back!',
  purchase_restore_none: 'ℹ️ No purchases found to restore',
  purchase_restore_failed: '🔄 Restore failed, try again later',

  // ── Diamonds ────────────────────────────────────────────────────────
  diamonds_not_enough: '💎 Not enough diamonds!',
  diamonds_plus_bonus: ' (Plus +50%)',
  diamonds_daily_reward: 'Daily reward!',
  diamonds_plus_daily: 'Plus daily bonus 👑',
  diamonds_already_claimed: "✅ You've already claimed today's reward!",
  diamonds_reward_label: '{amount} Diamonds',
  diamonds_reward_label_big: '{amount} Diamonds!',

  // ── Ads ─────────────────────────────────────────────────────────────
  ad_watch: 'Watch an Ad',
  ad_reward_title: '📺 Rewarded Video',
  ad_reward_sim: 'Ad simulation: 3 seconds',
  ad_interstitial_title: '📺 Ad',
  ad_interstitial_sim: 'Interstitial ad simulation',
  ad_interstitial_wait: 'Closeable in 2 seconds',
  ad_close: 'Close ✕',
  ad_load_failed: "📺 The ad couldn't load, try again later",
  ad_must_finish: '📺 Watch the ad to the end to get your reward',
  ad_blocked_consent: '📺 Ads unavailable — you can change your privacy choice in Profile',
  ad_daily_limit: "📺 You're out of free diamonds today — come back tomorrow!",
  ad_budget_plus: '👑 Plus: unlimited',
  ad_budget_empty: '📺 Come back tomorrow',
  ad_reward_toast: 'Ad reward!',
  ad_loading: '⏳ Loading ad…',
  offer_help: 'Help',
  offer_reward: 'Reward',
  offer_balance: 'Balance: 💎 {amount}',

  // ── Daily quests ────────────────────────────────────────────────────
  quest_play_3: 'Play 3 games',
  quest_win_1: 'Win 1 game',
  quest_daily_challenge: "Finish today's challenge",
  quest_toast: 'Quest: {name}',
  quest_all_done: 'All daily quests done! 🎉',
  quest_done_today: '✅ Done for today',

  // Haftalık görevler HENÜZ ÇİZİLMİYOR (sandık kurulmadı), ama tanım
  // dizisi duruyor — anahtarları şimdi yazmak, sandık geldiğinde 15 dilin
  // birden eksik kalmamasını sağlıyor.
  weekly_login7_name: '7 Day Check-in',
  weekly_login7_desc: 'Check in 7 days in a row',
  weekly_win15_name: 'Win 15 Games',
  weekly_win15_desc: 'Win 15 games',
  weekly_variety_name: '1 From Each Category',
  weekly_variety_desc: 'Play from every category',

  // ── Badges ──────────────────────────────────────────────────────────
  badges_screen_title: 'Badges',
  badges_screen_sub: 'Your collection and progress',
  badges_collections: 'Collections',
  badges_earned_kicker: 'Badge Earned',
  badges_all_earned: '🏆 All badges earned',
  badges_shop_progress: '🏆 {n}/{total} badges earned',
  badges_none_yet: 'No badges yet',
  badges_total_reward: '💎 {amount} total reward',
  badges_collection_pct: 'Collection {pct}%',
  badges_first_title: 'Earn your first badge',
  badges_first_desc: 'Start a game and it unlocks right away',
  badges_all_done_title: "You've collected every badge. More are on the way.",
  badges_all_done_desc: 'Finish quests, keep your streak and earn diamonds — badges unlock on their own.',
  badges_earned_today: 'Earned today',
  badges_earned_days_ago_one: 'Earned 1 day ago',
  badges_earned_days_ago_other: 'Earned {n} days ago',
  badges_last_earned: 'Your Last Badge',
  badge_group_games: 'Games',
  badge_group_streak: 'Streak',
  badge_group_economy: 'Economy',

  badge_first_game: 'First Game',
  badge_first_game_desc: 'Start your first game',
  badge_ten_games: '10 Games',
  badge_ten_games_desc: 'Play 10 games',
  badge_streak_7: '7 Day Streak',
  badge_streak_7_desc: 'Check in 7 days in a row',
  badge_streak_30: '30 Day Streak',
  badge_streak_30_desc: 'Check in 30 days in a row',
  badge_streak_50: '50 Day Streak',
  badge_streak_50_desc: 'Check in 50 days in a row',
  badge_streak_100: '100 Day Streak',
  badge_streak_100_desc: 'Check in 100 days in a row',
  badge_streak_250: '250 Day Streak',
  badge_streak_250_desc: 'Check in 250 days in a row',
  badge_streak_500: '500 Day Streak',
  badge_streak_500_desc: 'Check in 500 days in a row',
  badge_diamonds_500: '500 Diamonds',
  badge_diamonds_500_desc: 'Earn 500💎 in total',

  // ── Streak ──────────────────────────────────────────────────────────
  streak_milestone_7: '7 day streak bonus! 🔥',
  streak_milestone_14: '14 day streak! 🎉',
  streak_milestone_30: '30 day streak! 👑',
  day_mon: 'Mon', day_tue: 'Tue', day_wed: 'Wed', day_thu: 'Thu',
  day_fri: 'Fri', day_sat: 'Sat', day_sun: 'Sun',

  // ── Navigation ──────────────────────────────────────────────────────
  nav_back_exit: '↩︎ Press back again to exit',
  game_soon: '🎮 {name} — coming soon!',

  // ── Discover ────────────────────────────────────────────────────────
  discover_swipe_hint: 'Swipe',
  discover_open_full: '▶  PLAY FULL GAME',
  discover_play: '▶  PLAY',
  discover_locked: '🔒  SOON',
  discover_soon: 'Coming soon!',
  discover_favorited: '❤️ Added to favorites',
  discover_best: '🏆 Best: {score}',
  discover_unfavorited: '💔 Removed from favorites',
  discover_chip_favorites: 'Favorites',
  discover_fav_label: 'Favorite',
  discover_chip_puzzle: 'Puzzle',
  discover_chip_arcade: 'Arcade',

  demo_hint_wordsearch: 'DIAGONALS TOO',
  demo_hint_flow: 'DRAG TO CONNECT',
  demo_hint_watersort: 'MATCH THE COLORS',
  demo_solved: 'SOLVED!',

  // ── Game names ──────────────────────────────────────────────────────
  game_name_blockPuzzle: 'Block Puzzle',
  game_name_game2048: '2048',
  game_name_memoryGame: 'Memory Match',
  game_name_wordSearch: 'Word Hunt',
  game_name_sudoku: 'Sudoku',
  game_name_waterSort: 'Potion Sort',
  game_name_arrowPuzzle: 'Arrow Puzzle',
  game_name_flowConnect: 'Flow Connect',
  game_name_jigsawCard: 'Slide Puzzle',
  game_name_snakeGame: 'Snake',
  game_name_flappyUfo: 'Flappy UFO',

  game_desc_blockPuzzle: 'Place blocks, clear the lines!',
  game_desc_game2048: 'Swipe, merge, reach 2048!',
  game_desc_memoryGame: 'Match the cards, test your memory!',
  game_desc_wordSearch: 'Drag your finger, find the word!',
  game_desc_sudoku: 'Fill the 9x9 grid!',
  game_desc_waterSort: 'Sort the potions, separate the colors!',
  game_desc_arrowPuzzle: 'Clear the energy channels in the right order!',
  game_desc_flowConnect: 'Connect the colors, fill the board!',
  game_desc_jigsawCard: 'Slide the tiles to rebuild the photo!',
  game_desc_snakeGame: 'Classic snake — collect gems, grow long!',
  game_desc_flappyUfo: 'Tap, rise, glide through the gates!',

  game_tag_game2048: 'Merge numbers',
  game_tag_blockPuzzle: 'Place blocks',
  game_tag_memoryGame: 'Match the cards',
  game_tag_jigsawCard: 'Slide to rebuild the photo',
  game_tag_snakeGame: 'Classic snake — collect gems',
  game_tag_flappyUfo: 'Tap, rise, glide through',
  game_tag_flowConnect: 'Connect colors, fill the board',

  // ── Game shell / game over ──────────────────────────────────────────
  game_default_title: 'Game',
  game_score: 'SCORE',
  tooltip_music: 'Music',
  tooltip_sound: 'Sound',
  game_level_done: 'Level complete!',
  go_continue_plus: 'Continue (Plus)',
  go_continue_ad: 'Watch an Ad → Continue',
  go_continue_diamonds: '{cost} Diamonds → Continue',
  go_double_plus: '2x Score (Plus)',
  go_double_ad: 'Watch an Ad → 2x Score!',
  go_continue_title: 'Continue!',
  go_continuing: '🔄 Back in the game!',
  go_continue_free_plus: '👑 Plus: continue is free!',
  go_continue_spent: '{cost} diamonds spent — keep going!',
  go_double_title: '2x Score!',
  go_double_done: '🎉 Score doubled!',

  // ── 2048 ────────────────────────────────────────────────────────────
  g2048_undo: 'Undos',
  g2048_undo_ad: 'Watch an Ad → +1',
  g2048_undo_plus: '+1 Undo',
  g2048_undo_title: 'Undo',
  g2048_over_title: 'No Moves Left',
  g2048_over_msg: 'Highest tile: {tile}',

  // ── Memory ──────────────────────────────────────────────────────────
  memory_matches: 'Matches',
  memory_moves: 'Moves',
  memory_done_title: 'All Matched',
  memory_done_msg: 'You matched every card.',

  // ── Word Hunt ───────────────────────────────────────────────────────
  wordsearch_hud_level: 'LEVEL',
  wordsearch_hud_words: 'WORDS',

  // ── Sudoku ──────────────────────────────────────────────────────────
  sudoku_daily_badge: 'Daily',
  sudoku_over_title: 'Out of Magic',
  sudoku_over_msg: "You've run out of lives.",
  sudoku_win_title: 'Sudoku Solved',
  sudoku_win_msg: 'You completed the grid.',
  sudoku_daily_title: 'Daily Complete',
  sudoku_daily_msg: "You solved today's puzzle.",
  sudoku_filled: 'Filled',
  sudoku_remaining: 'Left',
  sudoku_streak: 'Streak',

  // ── Block Puzzle ────────────────────────────────────────────────────
  block_over_title: 'No Room Left',
  block_over_msg: 'No block fits anymore.',
  block_combo: 'COMBO x{n}',
  block_praise_1: 'Nice!',
  block_praise_2: 'Great!',
  block_praise_3: 'Awesome!',
  block_praise_4: 'Incredible!',
  block_praise_5: 'LEGENDARY!',

  // ── Potion Sort ─────────────────────────────────────────────────────
  watersort_prev_level_ad: 'Previous Level (ad)',
  watersort_restart_ad: 'Restart (ad)',
  watersort_over_title: 'Out of Moves',
  watersort_over_msg: 'Keep going with +{extra} moves.',
  watersort_tubes_done: 'Tubes Done',

  // ── Arrow Puzzle ────────────────────────────────────────────────────
  arrow_over_title: 'Out of Energy',
  arrow_over_msg: 'The channels went dark. Watch an ad to continue, or restart the level.',
  arrow_no_free: '✨ No arrow can leave right now',
  arrow_hint_ad: 'Watch an Ad → Hint',
  arrow_sound_on: 'Sound On',
  arrow_sound_off: 'Sound Off',
  arrow_zoom_in: 'Zoom in',
  arrow_zoom_out: 'Zoom out',
  arrow_zoom_slider: 'Zoom',
  arrow_remaining: 'Left',
  arrow_grid: 'Grid',

  // ── Snake ───────────────────────────────────────────────────────────
  snake_over_title: 'Snake Died',
  snake_over_msg: 'You hit yourself. Length: {length}',
  snake_win_title: 'Board Full!',
  snake_win_msg: 'The snake filled the whole board.',
  snake_resume: '🐍 Pick a direction to continue',

  // ── Flappy UFO ──────────────────────────────────────────────────────
  flappy_over_title: 'You Crashed!',
  flappy_over_msg_one: 'You passed 1 gate.',
  flappy_over_msg_other: 'You passed {n} gates.',
  flappy_resume: '🛸 Tap to continue',
  flappy_best: 'BEST: {score}',
  flappy_best_label: 'BEST SCORE',
  flappy_tap_continue: 'Tap to continue',
  flappy_tap_rise: 'Tap to rise',

  // ── Flow Connect ────────────────────────────────────────────────────
  flow_hint_ad: 'Watch an Ad → Hint',
  flow_all_connected: '✨ Everything is already connected',
  flow_no_hint: '💡 No hint on this board',
  flow_level_points: '{points} points',
  flow_gen_failed: "⚠️ Couldn't generate the level",

  // ── Slide Puzzle ────────────────────────────────────────────────────
});
