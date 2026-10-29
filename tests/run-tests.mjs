// Automated bilingual (Arabic / English) test suite for «قلعة الربض بنسخة رقمية».
// Runs static checks on the translation files + end-to-end browser tests with Playwright
// in BOTH languages, on desktop and mobile viewports.
//
// Usage:   npm i -D playwright   (once)   →   node tests/run-tests.mjs
// Output:  tests/results.json  +  docs/screenshots/*.png
import http from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = join(ROOT, 'docs/screenshots');
mkdirSync(SHOTS, { recursive: true });
const require = createRequire(import.meta.url);

let chromium;
try { ({ chromium } = await import('playwright')); }
catch { ({ chromium } = await import(pathToFileURL(process.env.PW_MODULE || '/opt/npm-tools/node_modules/playwright/index.mjs').href)); }

/* ------------------------------------------------------------------ harness */
const results = [];
let current = null;
async function test(group, name, fn) {
  const r = { group, name, status: 'pass', details: [] };
  current = r;
  try { await fn(r); } catch (e) { r.status = 'fail'; r.details.push(String(e && e.message || e)); }
  results.push(r);
  console.log((r.status === 'pass' ? '  ✔ ' : '  ✘ ') + `[${group}] ${name}` + (r.status === 'fail' ? '\n      ' + r.details.join('\n      ') : ''));
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function note(msg) { current && current.details.push(msg); }

/* ------------------------------------------------------------- static data */
const ar = JSON.parse(readFileSync(join(ROOT, 'translations/ar.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(ROOT, 'translations/en.json'), 'utf8'));
const DICT = { ar, en };
function flat(o, p = '', r = {}) {
  for (const k of Object.keys(o)) {
    const v = o[k], key = p ? p + '.' + k : k;
    if (v && typeof v === 'object') flat(v, key, r); else r[key] = v;
  }
  return r;
}
function get(d, key) { return key.split('.').reduce((o, k) => (o == null ? o : o[k]), d); }
const fa = flat(ar), fe = flat(en);
const ARABIC = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
// Latin tokens allowed inside Arabic UI: technical terms + the mandated language label.
const AR_LATIN_ALLOW = new Set(['SHA-256', 'HTTPS', 'HTTP', 'AR', 'a–f']);
// Keys whose value is intentionally in the other script (language labels / literal URLs in a quiz).
const AR_KEYS_ALLOW = [/^lang\.en$/, /^game\.questions\.q7\.options\./, /^meta\.(langCode|dir)$/];
const EN_KEYS_ALLOW = [/^lang\.ar$/, /^meta\.(langCode|dir)$/];
const latinTokens = (s) => (String(s).match(/[A-Za-z][A-Za-z0-9\-–]*/g) || []);

console.log('\nStatic checks');

await test('static', 'Arabic and English dictionaries have identical keys', () => {
  const missingAr = Object.keys(fe).filter((k) => !(k in fa));
  const missingEn = Object.keys(fa).filter((k) => !(k in fe));
  assert(!missingAr.length && !missingEn.length, `missing in ar: ${missingAr.join(', ')} | missing in en: ${missingEn.join(', ')}`);
  note(`${Object.keys(fa).length} keys in each file`);
});

await test('static', 'No empty translation values', () => {
  const empty = Object.entries({ ...Object.fromEntries(Object.entries(fa).map(([k, v]) => ['ar:' + k, v])), ...Object.fromEntries(Object.entries(fe).map(([k, v]) => ['en:' + k, v])) })
    .filter(([, v]) => typeof v === 'string' && !v.trim()).map(([k]) => k);
  assert(!empty.length, 'empty: ' + empty.join(', '));
});

await test('static', 'English file contains no Arabic text (except the Arabic language label)', () => {
  const bad = Object.entries(fe).filter(([k, v]) => typeof v === 'string' && ARABIC.test(v) && !EN_KEYS_ALLOW.some((re) => re.test(k)));
  assert(!bad.length, bad.map(([k, v]) => `${k}: ${v}`).join(' | '));
});

await test('static', 'Arabic file contains no untranslated English (only allowed technical terms)', () => {
  const bad = [];
  const used = new Set();
  for (const [k, v] of Object.entries(fa)) {
    if (typeof v !== 'string' || AR_KEYS_ALLOW.some((re) => re.test(k))) continue;
    for (const t of latinTokens(v.replace(/\{\w+\}/g, ''))) { if (AR_LATIN_ALLOW.has(t)) used.add(t); else bad.push(`${k}: "${t}"`); }
  }
  assert(!bad.length, bad.join(' | '));
  note('Technical terms kept in Latin script: ' + [...used].join(', '));
});

await test('static', 'Project identity (name & slogan) matches the specification', () => {
  assert(ar.meta.siteName === 'قلعة الربض بنسخة رقمية', 'ar name');
  assert(en.meta.siteName === 'Al-Rabadh Castle: A Digital Experience', 'en name');
  assert(ar.meta.tagline === 'من عراقة الماضي إلى أمان المستقبل', 'ar tagline');
  assert(en.meta.tagline === 'From Historic Heritage to a Secure Digital Future', 'en tagline');
  assert(ar.lang.ar === 'العربية | AR' && en.lang.en === 'English | EN', 'language labels');
});

await test('static', 'Game: same number of questions/options in both languages; one shared answer key', () => {
  const src = readFileSync(join(ROOT, 'js/data/content.js'), 'utf8');
  const qs = [...src.matchAll(/\{ id: '(q\d+)', stage: '(\w+)', correct: (\d)/g)].map((m) => ({ id: m[1], correct: +m[3] }));
  assert(qs.length === 12, 'expected 12 questions, found ' + qs.length);
  for (const q of qs) {
    const oa = ar.game.questions[q.id].options, oe = en.game.questions[q.id].options;
    assert(oa.length === 4 && oe.length === 4, q.id + ' options length');
    assert(q.correct >= 0 && q.correct < 4, q.id + ' correct index');
  }
  note('Correct answers are stored once (by index) in js/data/content.js and used for both languages.');
});

await test('static', 'translations.bundle.js (file:// fallback) is in sync with the JSON files', () => {
  const b = readFileSync(join(ROOT, 'translations/translations.bundle.js'), 'utf8');
  const json = JSON.parse(b.slice(b.indexOf('=') + 1).trim().replace(/;$/, ''));
  assert(JSON.stringify(json.ar) === JSON.stringify(ar) && JSON.stringify(json.en) === JSON.stringify(en), 'bundle out of date — run node tools/build-translations.mjs');
});

await test('static', 'URL analyzer returns language-neutral indicator ids (sample cases)', () => {
  const A = require(join(ROOT, 'js/lib/url-analyzer.js'));
  const cases = [
    ['https://www.example.org/heritage/ajloun-castle', 'low'],
    ['http://192.168.10.5/archive/verify-login.exe?next=https://paypa1-secure.example.xyz', 'high'],
    ['javascript:alert(1)', 'high'],
    ['bit.ly/abc123', 'low']
  ];
  for (const [u, lvl] of cases) { const r = A.analyze(u); assert(r.ok && r.level === lvl, `${u} → ${r.level} (expected ${lvl})`); }
  assert(A.analyze('').error === 'empty' && A.analyze('not a url').error === 'invalid', 'error ids');
  for (const id of Object.keys(A.WEIGHTS)) assert(ar.links.indicators[id] && en.links.indicators[id], 'indicator text missing for ' + id);
});

/* ------------------------------------------------------------ static server */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f) || statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

/* ---------------------------------------------------------------- browser */
const browser = await chromium.launch();
const ROUTES = ['home', 'tour', 'library', 'hash', 'links', 'awareness', 'game', 'about'];
const VIEWPORTS = { desktop: { width: 1366, height: 900 }, mobile: { width: 390, height: 844 } };

async function newPage(lang, vp = 'desktop') {
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vp], deviceScaleFactor: 1, hasTouch: vp === 'mobile', isMobile: vp === 'mobile' });
  // Block external font requests so tests are deterministic offline.
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (lang) await ctx.addInitScript((l) => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('rabadh.lang', l); sessionStorage.setItem('seeded', '1'); } } catch (e) {} }, lang);
  const page = await ctx.newPage();
  page._errors = [];
  page.on('pageerror', (e) => page._errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text())) page._errors.push(m.text()); if (/missing key/.test(m.text())) page._errors.push(m.text()); });
  return { ctx, page };
}
async function go(page, route) {
  await page.goto(BASE + '#/' + route);
  await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'));
  await page.waitForTimeout(150);
}
// Click like a real user (mouse at the element's position). Playwright's locator.click()
// scrolls sticky elements "into view", which would mask the scroll-preservation check.
async function mouseClick(page, selector) {
  const box = await page.locator(selector).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
async function switchLang(page, lang, opts = {}) {
  const click = opts.mouse ? (sel) => mouseClick(page, sel) : (sel) => page.click(sel);
  await click('#lang-btn');
  await page.waitForSelector('#lang-menu:not([hidden])');
  await click(`#lang-menu [data-lang="${lang}"]`);
  await page.waitForFunction((l) => document.documentElement.lang === l, lang);
  await page.waitForTimeout(100);
}

/** Scan the rendered page for text in the wrong language. */
async function scanLanguage(page, lang) {
  return page.evaluate(({ lang, allow }) => {
    const AR = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
    const SKIP = '.keep-lang, .url-content, .user-content, code, .hash-value, script, style, noscript, svg';
    const issues = [], missing = [];
    const exempt = (el) => {
      if (!el) return true;
      if (el.closest(SKIP)) return true;
      const langEl = el.closest('[lang]');
      return langEl && langEl !== document.documentElement && langEl.getAttribute('lang') !== lang;
    };
    const check = (text, where) => {
      if (/⟦/.test(text)) missing.push(where + ': ' + text.trim().slice(0, 80));
      if (lang === 'en') { if (AR.test(text)) issues.push(where + ': ' + text.trim().slice(0, 80)); }
      else {
        const toks = (text.match(/[A-Za-z][A-Za-z0-9\-–]*/g) || []).filter((t) => !allow.includes(t));
        if (toks.length) issues.push(where + ': ' + toks.join(' '));
      }
    };
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = w.nextNode())) { if (n.nodeValue.trim() && !exempt(n.parentElement)) check(n.nodeValue, n.parentElement.tagName.toLowerCase() + '.' + (n.parentElement.className || '').toString().split(' ')[0]); }
    document.querySelectorAll('[placeholder],[aria-label],[title],img[alt]').forEach((el) => {
      if (exempt(el)) return;
      ['placeholder', 'aria-label', 'title', 'alt'].forEach((a) => { const v = el.getAttribute(a); if (v) check(v, '@' + a); });
    });
    check(document.title, 'document.title');
    return { issues, missing };
  }, { lang, allow: ['SHA-256', 'HTTPS', 'HTTP', 'AR', 'a–f'] });
}
async function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
}

console.log('\nBrowser checks');

// 1. First visit defaults
await test('language', 'First visit (no saved preference) opens in Arabic, RTL, with English option visible', async () => {
  const { ctx, page } = await newPage(null);
  await go(page, 'home');
  const s = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, btn: document.querySelector('#lang-current').textContent, opts: [...document.querySelectorAll('#lang-menu [data-lang]')].map((b) => b.textContent), stored: localStorage.getItem('rabadh.lang') }));
  assert(s.lang === 'ar' && s.dir === 'rtl', JSON.stringify(s));
  assert(s.btn === 'العربية | AR', 'button label: ' + s.btn);
  assert(s.opts.includes('English | EN'), 'English option missing');
  assert(s.stored === null, 'preference should not be stored before the user chooses');
  await ctx.close();
});

// 2. Per language × route × viewport
for (const lang of ['ar', 'en']) {
  for (const vpName of Object.keys(VIEWPORTS)) {
    await test(`pages-${lang}-${vpName}`, `All 8 sections render fully in ${lang === 'ar' ? 'Arabic' : 'English'} (${vpName})`, async () => {
      const { ctx, page } = await newPage(lang, vpName);
      const problems = [];
      for (const route of ROUTES) {
        await go(page, route);
        if (route === 'library') { await page.locator('.lib-card button').first().click(); await page.waitForTimeout(100); }
        if (route === 'awareness') { for (const b of await page.locator('.topic__toggle').all()) await b.click(); }
        const meta = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, title: document.title, h1: (document.querySelector('h1') || {}).textContent }));
        const expDir = lang === 'ar' ? 'rtl' : 'ltr';
        if (meta.lang !== lang || meta.dir !== expDir) problems.push(`${route}: lang/dir ${meta.lang}/${meta.dir}`);
        const expTitle = get(DICT[lang], 'meta.pages.' + route) + ' | ' + DICT[lang].meta.siteName;
        if (meta.title !== expTitle) problems.push(`${route}: title "${meta.title}"`);
        if (!meta.h1 || !meta.h1.trim()) problems.push(`${route}: empty h1`);
        const scan = await scanLanguage(page, lang);
        scan.issues.forEach((i) => problems.push(`${route}: wrong-language text → ${i}`));
        scan.missing.forEach((i) => problems.push(`${route}: missing key → ${i}`));
        if (!(await noOverflow(page))) problems.push(`${route}: horizontal overflow`);
        if (vpName === 'desktop' || ['home', 'tour', 'game', 'links'].includes(route)) {
          await page.keyboard.press('Escape');
          await page.screenshot({ path: join(SHOTS, `${lang}-${vpName}-${route}.png`), fullPage: vpName === 'mobile' ? false : true });
        }
      }
      if (page._errors.length) problems.push('console errors: ' + page._errors.join(' | '));
      assert(!problems.length, problems.join('\n'));
      note('Checked: lang/dir attributes, page title, wrong-language text in visible + screen-reader text and placeholders/aria-labels, missing keys, horizontal overflow.');
      await ctx.close();
    });
  }
}

// 3. Switching keeps section + remembers preference
await test('language', 'Switching language keeps the current section, scroll position and state; preference survives reload', async () => {
  const { ctx, page } = await newPage(null);
  await go(page, 'tour?s=5');
  await page.evaluate(() => window.scrollTo(0, 400));
  const before = await page.evaluate(() => ({ hash: location.hash, y: scrollY, h: document.querySelector('.stop__title').textContent }));
  await switchLang(page, 'en', { mouse: true });
  const after = await page.evaluate(() => ({ hash: location.hash, y: scrollY, h: document.querySelector('.stop__title').textContent, dir: document.documentElement.dir, stored: localStorage.getItem('rabadh.lang'), keys: Object.keys(localStorage), toast: (document.querySelector('.toast') || {}).textContent }));
  assert(after.hash === before.hash, `hash changed ${before.hash} → ${after.hash}`);
  assert(Math.abs(after.y - before.y) < 5, `scroll moved ${before.y} → ${after.y}`);
  assert(after.h === en.tour.stations.aybak.title && before.h === ar.tour.stations.aybak.title, `stop title ${before.h} → ${after.h}`);
  assert(after.dir === 'ltr' && after.stored === 'en', 'dir/stored');
  assert(after.keys.length === 1 && after.keys[0] === 'rabadh.lang', 'localStorage should only hold the language code: ' + after.keys);
  assert(after.toast === en.lang.changed, 'toast: ' + after.toast);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'));
  const reloaded = await page.evaluate(() => ({ lang: document.documentElement.lang, hash: location.hash, btn: document.querySelector('#lang-current').textContent }));
  assert(reloaded.lang === 'en' && reloaded.hash === before.hash && reloaded.btn === 'English | EN', JSON.stringify(reloaded));
  await switchLang(page, 'ar');
  const back = await page.evaluate(() => ({ dir: document.documentElement.dir, btn: document.querySelector('#lang-current').textContent, toast: [...document.querySelectorAll('.toast')].pop().textContent }));
  assert(back.dir === 'rtl' && back.btn === 'العربية | AR' && back.toast === ar.lang.changed, JSON.stringify(back));
  await ctx.close();
});

await test('language', 'Language switch is reachable and works from every section (desktop + mobile)', async () => {
  for (const vp of ['desktop', 'mobile']) {
    const { ctx, page } = await newPage('ar', vp);
    for (const route of ROUTES) {
      await go(page, route);
      assert(await page.locator('#lang-btn').isVisible(), `${vp}/${route}: button hidden`);
      try { await switchLang(page, 'en'); } catch (e) { throw new Error(`${vp}/${route} → en: ${e.message.split('\n')[0]}`); }
      const h = await page.evaluate(() => location.hash);
      assert(h === '#/' + route || h.startsWith('#/' + route + '?'), `${vp}/${route}: route lost (${h})`);
      try { await switchLang(page, 'ar'); } catch (e) { throw new Error(`${vp}/${route} → ar: ${e.message.split('\n')[0]}`); }
    }
    await ctx.close();
  }
});

await test('language', 'Keyboard: language menu opens with keyboard, Escape closes it', async () => {
  const { ctx, page } = await newPage('ar');
  await go(page, 'home');
  await page.focus('#lang-btn');
  await page.keyboard.press('ArrowDown');
  assert(await page.locator('#lang-menu').isVisible(), 'menu not open');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  await page.focus('#lang-btn'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape');
  assert(!(await page.locator('#lang-menu').isVisible()), 'menu not closed');
  await ctx.close();
});

// 4. Navigation buttons
for (const lang of ['ar', 'en']) {
  await test(`buttons-${lang}`, `Navigation menu works (desktop links + mobile menu) in ${lang}`, async () => {
    const { ctx, page } = await newPage(lang);
    await go(page, 'home');
    for (const route of ROUTES) {
      await page.click(`.primary-nav a[data-route="${route}"]`);
      await page.waitForFunction((r) => document.querySelector('#view').dataset.route === r, route);
      const cur = await page.getAttribute(`.primary-nav a[data-route="${route}"]`, 'aria-current');
      assert(cur === 'page', route + ' aria-current');
    }
    await ctx.close();
    const m = await newPage(lang, 'mobile');
    await go(m.page, 'home');
    await m.page.click('#nav-toggle');
    assert(await m.page.locator('#primary-nav').isVisible(), 'mobile nav not visible');
    const label = await m.page.getAttribute('#nav-toggle', 'aria-label');
    assert(label === DICT[lang].nav.closeMenu, 'toggle label ' + label);
    await m.page.screenshot({ path: join(SHOTS, `${lang}-mobile-menu.png`) });
    await m.page.click('#primary-nav a[data-route="about"]');
    await m.page.waitForFunction(() => document.querySelector('#view').dataset.route === 'about');
    assert(!(await m.page.locator('#primary-nav').isVisible()), 'menu should close after navigation');
    await m.ctx.close();
  });
}

// 5. Tour
for (const lang of ['ar', 'en']) {
  await test(`tour-${lang}`, `Tour: next/previous, map stops, arrow keys follow ${lang === 'ar' ? 'RTL' : 'LTR'} direction`, async () => {
    const { ctx, page } = await newPage(lang);
    await go(page, 'tour');
    const title = () => page.textContent('.stop__title');
    assert((await title()) === DICT[lang].tour.stations.approach.title, 'first stop');
    await page.click('.stop__controls .btn--primary');
    assert((await title()) === DICT[lang].tour.stations.moat.title, 'next');
    assert((await page.evaluate(() => location.hash)) === '#/tour?s=2', 'hash param');
    await page.click('.stop__controls .btn--ghost');
    assert((await title()) === DICT[lang].tour.stations.approach.title, 'prev');
    await page.click('.hotspot[data-index="6"]');
    assert((await title()) === DICT[lang].tour.stations.signals.title, 'map hotspot');
    assert((await page.textContent('.stop .badge')).includes(DICT[lang].status.needsVerification), 'status badge');
    await page.focus('.hotspot[data-index="6"]');
    await page.keyboard.press(lang === 'ar' ? 'ArrowLeft' : 'ArrowRight');
    assert((await title()) === DICT[lang].tour.stations.later.title, 'forward arrow key');
    assert(await page.locator('.stop__finish').isVisible(), 'finish panel');
    const label = await page.getAttribute('.hotspot[data-index="0"]', 'aria-label');
    assert(label === DICT[lang].tour.stationAria.replace('{n}', '1').replace('{title}', DICT[lang].tour.stations.approach.title), 'hotspot aria-label ' + label);
    await ctx.close();
  });
}

// 6. Library
for (const lang of ['ar', 'en']) {
  await test(`library-${lang}`, `Library: search, filters, details popup and empty-state message in ${lang}`, async () => {
    const { ctx, page } = await newPage(lang);
    await go(page, 'library');
    const visible = () => page.locator('.lib-card:visible').count();
    assert((await visible()) === 12, 'all 12 entries');
    await page.fill('#lib-search', lang === 'ar' ? 'أيبك' : 'Aybak');
    const n = await visible();
    assert(n >= 2, 'search results ' + n);
    assert((await page.textContent('.lib-count')) === DICT[lang].library.count.replace('{n}', n), 'count text');
    await page.fill('#lib-search', 'zzzqqq');
    assert(await page.locator('.empty').isVisible(), 'empty state');
    assert((await page.textContent('.empty p')) === DICT[lang].library.noResults, 'no results text');
    await page.click('.empty button');
    await page.click('[data-cat="people"]');
    assert((await visible()) === 2, 'people filter');
    await page.click('[data-cat="all"]');
    await page.click('.lib-card[data-id="inscription"] button');
    assert((await page.textContent('.modal__title')) === DICT[lang].library.items.inscription.title, 'modal title');
    assert((await page.textContent('.modal .badge')).includes(DICT[lang].status.needsVerification), 'modal badge');
    assert((await page.getAttribute('.modal__close', 'aria-label')) === DICT[lang].common.close, 'close label');
    await page.keyboard.press('Escape');
    assert((await page.locator('.modal').count()) === 0, 'modal closes with Escape');
    await ctx.close();
  });
}

// 7. SHA-256
const ABC = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
for (const lang of ['ar', 'en']) {
  await test(`hash-${lang}`, `SHA-256: text + file hashing, match/mismatch/invalid/empty messages in ${lang}`, async () => {
    const { ctx, page } = await newPage(lang);
    await go(page, 'hash');
    const D = DICT[lang].hash.msg;
    await page.click('#hash-compute-file');
    assert((await page.textContent('#hash-status')) === D.noFile, 'noFile message');
    const content = Buffer.from('قلعة الربض — Ajloun Castle heritage photo placeholder\n'.repeat(2000));
    const expected = createHash('sha256').update(content).digest('hex');
    await page.setInputFiles('#hash-file', { name: 'ajloun-castle-photo.jpg', mimeType: 'image/jpeg', buffer: content });
    await page.click('#hash-compute-file');
    await page.waitForFunction(() => document.querySelector('#hash-output').textContent.length === 64);
    assert((await page.textContent('#hash-output')) === expected, 'file hash mismatch with Node crypto');
    assert((await page.textContent('#hash-status')) === D.done, 'done message');
    await page.fill('#hash-expected', expected.toUpperCase());
    await page.click('#hash-compare');
    assert((await page.textContent('#hash-compare-status')) === D.match, 'match message');
    await page.fill('#hash-expected', ABC);
    await page.click('#hash-compare');
    assert((await page.textContent('#hash-compare-status')) === D.mismatch, 'mismatch message');
    await page.fill('#hash-expected', 'xyz');
    await page.click('#hash-compare');
    assert((await page.textContent('#hash-compare-status')) === D.invalidHash, 'invalid message');
    // Switch language: messages re-translate, fingerprint value unchanged
    const other = lang === 'ar' ? 'en' : 'ar';
    await switchLang(page, other);
    assert((await page.textContent('#hash-compare-status')) === DICT[other].hash.msg.invalidHash, 'message re-translated after switch');
    assert((await page.textContent('#hash-output')) === expected, 'hash changed after language switch');
    await switchLang(page, lang);
    await page.click('#tab-text');
    await page.fill('#hash-text', 'abc');
    await page.click('#hash-compute-text');
    await page.waitForFunction((h) => document.querySelector('#hash-output').textContent === h, ABC);
    assert((await page.textContent('#hash-status')) === D.doneText, 'text done message');
    await page.screenshot({ path: join(SHOTS, `${lang}-desktop-hash-result.png`), fullPage: true });
    await ctx.close();
  });
}

await test('hash', 'Pure-JS SHA-256 fallback matches Node crypto (5 vectors)', async () => {
  const { ctx, page } = await newPage('ar');
  await go(page, 'hash');
  for (const s of ['', 'abc', 'قلعة الربض', 'a'.repeat(1000), 'x'.repeat(55)]) {
    const got = await page.evaluate((t) => window.RabadhHash.pure(new TextEncoder().encode(t)), s);
    assert(got === createHash('sha256').update(s).digest('hex'), 'vector ' + JSON.stringify(s.slice(0, 10)));
  }
  await ctx.close();
});

// 8. Link checker
for (const lang of ['ar', 'en']) {
  await test(`links-${lang}`, `Link checker: errors, indicators and explanations in ${lang}; link text never altered`, async () => {
    const { ctx, page } = await newPage(lang);
    await go(page, 'links');
    await page.click('#link-analyze');
    assert((await page.textContent('#link-status')) === DICT[lang].links.errors.empty, 'empty error');
    await page.fill('#link-input', 'not a url');
    await page.click('#link-analyze');
    assert((await page.textContent('#link-status')) === DICT[lang].links.errors.invalid, 'invalid error');
    const url = 'http://192.168.10.5/archive/verify-login.exe?next=https://paypa1-secure.example.xyz';
    await page.click('#example-suspicious');
    assert((await page.getAttribute('.result-card', 'data-level')) === 'high', 'level high');
    assert((await page.textContent('.level-pill')).trim() === DICT[lang].links.levels.high, 'level label');
    assert((await page.textContent('#analyzed-url')) === url, 'URL displayed unchanged');
    const ids = await page.$$eval('.indicator', (els) => els.map((e) => e.dataset.indicator));
    for (const id of ['ipHost', 'executable', 'noHttps', 'keywords', 'redirectParam']) assert(ids.includes(id), 'missing indicator ' + id);
    const titles = await page.$$eval('.indicator__title', (els) => els.map((e) => e.textContent));
    assert(titles.every((t, i) => t === DICT[lang].links.indicators[ids[i]].title), 'indicator titles');
    const other = lang === 'ar' ? 'en' : 'ar';
    await switchLang(page, other);
    assert((await page.textContent('#analyzed-url')) === url, 'URL changed after language switch');
    assert((await page.textContent('.indicator__title')) === DICT[other].links.indicators[ids[0]].title, 're-translated indicator');
    await switchLang(page, lang);
    await page.click('#example-safe');
    assert((await page.getAttribute('.result-card', 'data-level')) === 'low', 'safe example low');
    await ctx.close();
  });
}

// 9. Game parity
async function playGame(lang, strategy, switchAt) {
  const { ctx, page } = await newPage(lang);
  await go(page, 'game');
  const answers = await page.evaluate(() => window.RabadhContent.GAME.questions.map((q) => q.correct));
  await page.click('#game-start');
  const trace = [];
  for (let i = 0; i < 12; i++) {
    if (switchAt === i) await switchLang(page, lang === 'ar' ? 'en' : 'ar');
    const pick = strategy(i, answers[i]);
    await page.click(`.option[data-index="${pick}"]`);
    const st = await page.evaluate(() => window.__rabadhGame.state);
    trace.push({ i, pick, score: st.score, shields: st.shields });
    const fb = await page.textContent('.feedback__title');
    const L = await page.evaluate(() => document.documentElement.lang);
    assert(fb === (pick === answers[i] ? DICT[L].game.correct : DICT[L].game.wrong), `feedback text q${i + 1}: ${fb}`);
    await page.click('#game-next');
    if (st.shields <= 0) break;
  }
  const end = await page.evaluate(() => ({ result: document.querySelector('.end').dataset.result, title: document.querySelector('.end__title').textContent, score: document.querySelector('#game-final-score').textContent, lang: document.documentElement.lang }));
  await page.screenshot({ path: join(SHOTS, `${lang}-desktop-game-${end.result}.png`), fullPage: false });
  await ctx.close();
  return { trace, end };
}
const allRight = (i, c) => c;
const allWrong = (i, c) => (c + 1) % 4;
const mixed = (i, c) => (i % 4 === 3 ? (c + 1) % 4 : c);
await test('game', 'Same answer key, scores and outcome in Arabic and English (perfect run, losing run, mixed run)', async () => {
  for (const [name, strat] of [['perfect', allRight], ['losing', allWrong], ['mixed', mixed]]) {
    const a = await playGame('ar', strat), e = await playGame('en', strat);
    assert(JSON.stringify(a.trace) === JSON.stringify(e.trace), `${name}: traces differ\nAR ${JSON.stringify(a.trace)}\nEN ${JSON.stringify(e.trace)}`);
    assert(a.end.result === e.end.result, `${name}: outcome differs`);
    note(`${name}: ${a.trace.length} questions, final score ${a.trace.at(-1).score}, outcome ${a.end.result} — identical in both languages`);
    assert(a.end.title === (a.end.result === 'win' ? ar.game.winTitle : ar.game.loseTitle), 'ar end title');
    assert(e.end.title === (e.end.result === 'win' ? en.game.winTitle : en.game.loseTitle), 'en end title');
  }
});
await test('game', 'Switching language in the middle of the game keeps question, score and shields', async () => {
  const r = await playGame('ar', mixed, 5);
  const ref = await playGame('en', mixed);
  assert(JSON.stringify(r.trace) === JSON.stringify(ref.trace), 'trace differs after mid-game switch');
  assert(r.end.lang === 'en' && r.end.score === en.game.finalScore.replace('{score}', ref.trace.at(-1).score).replace('{max}', 120), 'final screen language/score: ' + r.end.score);
});
for (const lang of ['ar', 'en']) {
  await test(`game-${lang}`, `Game popups (rules, quit confirmation) are translated in ${lang}`, async () => {
    const { ctx, page } = await newPage(lang);
    await go(page, 'game');
    await page.click('#game-rules');
    assert((await page.textContent('.modal__title')) === DICT[lang].game.rulesTitle, 'rules title');
    assert((await page.locator('.modal li').count()) === 5, 'rules list');
    await page.click('.modal .btn--primary');
    await page.click('#game-start');
    await page.click('#game-quit');
    assert((await page.textContent('.modal__title')) === DICT[lang].game.quitTitle, 'quit title');
    await page.click('.modal .btn--danger');
    assert((await page.getAttribute('#game-root', 'data-phase')) === 'intro', 'back to intro');
    await ctx.close();
  });
}

// 10. Awareness + help popup
for (const lang of ['ar', 'en']) {
  await test(`awareness-${lang}`, `Awareness tips toggle, checklist progress and footer help popup in ${lang}`, async () => {
    const { ctx, page } = await newPage(lang);
    await go(page, 'awareness');
    const btn = page.locator('.topic__toggle').first();
    await btn.click();
    assert((await btn.textContent()) === DICT[lang].awareness.hideTips, 'toggle label');
    for (let i = 0; i < 8; i++) await page.check('#chk-' + i);
    assert((await page.textContent('.check-progress__text')) === DICT[lang].awareness.progress.replace('{done}', 8).replace('{total}', 8), 'progress');
    assert((await page.textContent('.check-progress__level')) === DICT[lang].awareness.levels.done, 'level');
    await page.click('#help-btn');
    assert((await page.textContent('.modal__title')) === DICT[lang].about.helpTitle, 'help title');
    assert((await page.locator('.modal .help-list__item').count()) === 7, 'help sections');
    await ctx.close();
  });
}

// 11. file:// mode
await test('language', 'Works when opened directly from disk (file://) using the translation bundle', async () => {
  const ctx = await browser.newContext();
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(join(ROOT, 'index.html')).href + '#/about');
  await page.waitForFunction(() => document.documentElement.classList.contains('is-ready'));
  assert((await page.textContent('h1')) === ar.about.title, 'about title (ar)');
  await page.click('#lang-btn'); await page.click('#lang-menu [data-lang="en"]');
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  assert((await page.textContent('h1')) === en.about.title, 'about title (en)');
  await ctx.close();
});

// 12. "Translation unavailable" safeguard
await test('language', 'A missing (null) translation shows an honest notice instead of invented text', async () => {
  const { ctx, page } = await newPage('en');
  await go(page, 'library');
  const out = await page.evaluate(() => {
    I18n._dictionaries.en.library.items.towers.summary = null; // simulate an unavailable translation
    I18n.apply(document);
    const el = document.querySelector('.lib-card[data-id="towers"] .lib-card__summary');
    return { text: el.textContent, cls: el.classList.contains('i18n-unavailable') };
  });
  assert(out.text === en.common.translationUnavailable && out.cls, JSON.stringify(out));
  await ctx.close();
});

await browser.close();
server.close();

const summary = { date: new Date().toISOString(), total: results.length, passed: results.filter((r) => r.status === 'pass').length, failed: results.filter((r) => r.status === 'fail').length };
writeFileSync(join(ROOT, 'tests/results.json'), JSON.stringify({ summary, results }, null, 2));
console.log(`\n${summary.passed}/${summary.total} passed, ${summary.failed} failed`);
process.exit(summary.failed ? 1 : 0);
