// ═══════════════════════════════════════════════════════════════
//  SlySwipe — Node için DOM/tarayıcı kum havuzu (test aracı)
// ═══════════════════════════════════════════════════════════════
// PAYLAŞILAN altyapı: uygulamayı bir vm bağlamında, tarayıcı olmadan
// çalıştırır. Sıfır bağımlılık, yalnızca Node çekirdeği — proje
// build'siz kalır (bkz. CLAUDE.md §6). Bu bir BUILD ADIMI DEĞİL, test
// aracı; uygulamaya hiçbir şey eklemiyor.
//
// game-events-test.js'teki stub'ların doğrudan devamı. Tek anlamlı fark:
// getElementById ÖNBELLEKLİ — aynı id her seferinde AYNI öğeyi döndürür,
// böylece render fonksiyonlarının yazdığı innerHTML okunabiliyor
// (Faz 1'de gerekmiyordu, orada yalnızca olaylar ölçülüyordu).

'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// KAYNAK TARAMASI İÇİN DOSYA OKUMA — satır sonları NORMALİZE EDİLİR.
//
// Bu tek satır gerçek bir hatayı kapatıyor (2026-08-12). Harness'lerin
// en güçlü katmanı kaynağı tarayan iddialar ve çoğu YAKINLIK regex'i:
// "şu çağrı bundan sonraki 900 karakter içinde geçiyor mu". Windows'ta
// çalışma kopyası CRLF olduğu için her satır sonu bir karakter FAZLA
// sayılıyor, yani aynı kod depoda geçerken diskte düşebiliyor.
//
// Ölçülen örnek: badges-test'in "StreakSystem.checkIn() rozet kontrolü
// tetikliyor" iddiasında mesafe LF'te 889, CRLF'te 907 — bütçe 900.
// Yani iddia düşmeye 11 karakter uzaktaydı ve fark koda değil, dosyanın
// nasıl checkout edildiğine bağlıydı. Windows'ta temiz bir `git clone`
// yapan herkes bunu kırık bulurdu.
//
// Bir kaynak taraması KODU ölçmeli, satır sonu biçimini değil.
function readSrc(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
}

// index.html'deki yükleme sırasının AYNISI. Sıra bozulursa gerçek
// uygulamadaki hata burada da çıkmalı (bkz. CLAUDE.md §2).
const LOAD_ORDER = ['core/rng.js', 'games/games.js', 'core/ui-kit.js',
                    'reels/reels.js', 'core/daily.js', 'core/app.js'];

function ctx2d() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      return function () { return grad; };
    },
    set(t, k, v) { t[k] = v; return true; },
  });
}

function stubEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    style: new Proxy({}, { get(t, k) {
      if (k === 'setProperty' || k === 'removeProperty') return function () {};
      return t[k] !== undefined ? t[k] : '';
    }, set(t, k, v) { t[k] = v; return true; } }),
    // classList GERÇEK bir küme: sfi-off gibi sınıf geçişleri test
    // edilebilsin diye (AdBudget/DailyQuests satırı pasifleştirme).
    _classes: new Set(),
    classList: {
      add(c) { el._classes.add(c); },
      remove(c) { el._classes.delete(c); },
      toggle(c, on) { on ? el._classes.add(c) : el._classes.delete(c); },
      contains(c) { return el._classes.has(c); },
    },
    dataset: {}, children: [], width: 300, height: 300,
    appendChild(c) { this.children.push(c); return c; },
    insertBefore(c) { this.children.push(c); return c; },
    insertAdjacentHTML() {}, insertAdjacentElement() {},
    removeChild() {}, remove() {}, replaceChildren() {}, scrollIntoView() {},
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    hasAttribute() { return false; },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    querySelector() { return stubEl(); }, querySelectorAll() { return []; },
    closest() { return null; }, contains() { return false; },
    getBoundingClientRect() { return { left:0, top:0, right:300, bottom:300, width:300, height:300 }; },
    getContext() { return ctx2d(); },
    focus() {}, blur() {}, cloneNode() { return stubEl(tag); },
    animate() { return { cancel() {}, finished: Promise.resolve() }; },
    innerHTML: '', outerHTML: '', textContent: '', value: '', disabled: false,
    offsetWidth: 300, offsetHeight: 300, clientWidth: 300, clientHeight: 300,
  };
  return el;
}

// `store` verilirse localStorage o sözlüğün ÜZERİNE kurulur — "uygulamayı
// kapat/aç" senaryosu bu şekilde kuruluyor: yeni bir sandbox, eski disk.
function makeSandbox(store) {
  const byId = {};
  const doc = {
    head: stubEl(), body: stubEl(), documentElement: stubEl(),
    createElement: stubEl, createElementNS: stubEl, createTextNode: stubEl,
    createDocumentFragment: stubEl,
    // ÖNBELLEKLİ: renderMissions'ın yazdığı innerHTML okunabilsin.
    getElementById(id) { return byId[id] || (byId[id] = stubEl()); },
    querySelector: () => stubEl(), querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    visibilityState: 'visible', hidden: false, readyState: 'complete',
  };
  store = store || {};
  const sb = {
    document: doc,
    navigator: { userAgent: 'node', vibrate() {}, maxTouchPoints: 0, language: 'tr' },
    localStorage: {
      getItem(k) { return k in store ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
      removeItem(k) { delete store[k]; },
      clear() { for (const k in store) delete store[k]; },
    },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    console: { log() {}, warn() {}, error() {}, info() {} },   // sessiz: test çıktısı bizim
    Math, Date, JSON, performance: { now: () => Date.now() },
    AudioContext: function () { throw new Error('node: ses yok'); },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    IntersectionObserver: function () { return { observe() {}, unobserve() {}, disconnect() {} }; },
    ResizeObserver: function () { return { observe() {}, unobserve() {}, disconnect() {} }; },
    MutationObserver: function () { return { observe() {}, disconnect() {} }; },
    Image: function () { return stubEl('img'); },
    addEventListener() {}, removeEventListener() {},
    innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
    screen: { width: 390, height: 844, availWidth: 390, availHeight: 844 },
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    _store: store,
  };
  sb.window = sb; sb.globalThis = sb;
  vm.createContext(sb);
  for (const rel of LOAD_ORDER) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
  }
  // Üst düzey `const` sandbox NESNESİNE değil global sözlük kapsamına
  // gider; oradan ancak ifade değerlendirerek alınır.
  const get = (expr) => vm.runInContext(expr, sb, { filename: 'eval' });
  return { sb, store, byId, get, stubEl };
}

module.exports = { ROOT, LOAD_ORDER, makeSandbox, stubEl, ctx2d, readSrc };
