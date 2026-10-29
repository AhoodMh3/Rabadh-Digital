/*
 * i18n.js — Central bilingual (Arabic / English) engine for
 * «قلعة الربض بنسخة رقمية» / "Al-Rabadh Castle: A Digital Experience".
 *
 * Responsibilities
 *  1. Read the chosen language (saved preference → default Arabic).
 *  2. Load the translation dictionaries (translations/ar.json, translations/en.json).
 *  3. Update every translatable node on the page (data-i18n, data-i18n-attr).
 *  4. Switch page direction (RTL / LTR) and the <html lang> attribute.
 *  5. Keep the current page/section (no navigation, no reload, no scroll jump).
 *  6. Update the document title, meta description and all dynamic messages.
 *  7. Persist ONLY the language code in localStorage (no personal data).
 */
(function (global) {
  'use strict';

  var SUPPORTED = ['ar', 'en'];
  var DEFAULT_LANG = 'ar';
  var STORAGE_KEY = 'rabadh.lang';

  var dictionaries = {};          // { ar: {...}, en: {...} }
  var listeners = [];
  var state = { lang: DEFAULT_LANG, titleKey: 'meta.pages.home' };

  /* ---------- storage (guarded: private mode / blocked storage) ---------- */
  function readSaved() {
    try {
      var v = global.localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.indexOf(v) !== -1 ? v : null;
    } catch (e) { return null; }
  }
  function save(lang) {
    try { global.localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* ignore */ }
  }

  /* ---------- loading ---------- */
  function loadBundleScript() {
    // Fallback for file:// (fetch of local JSON is blocked by browsers).
    return new Promise(function (resolve, reject) {
      if (global.RABADH_TRANSLATIONS) { resolve(global.RABADH_TRANSLATIONS); return; }
      var s = document.createElement('script');
      s.src = 'translations/translations.bundle.js';
      s.onload = function () {
        global.RABADH_TRANSLATIONS ? resolve(global.RABADH_TRANSLATIONS) : reject(new Error('bundle empty'));
      };
      s.onerror = function () { reject(new Error('bundle load failed')); };
      document.head.appendChild(s);
    });
  }

  function loadDictionary(lang) {
    if (dictionaries[lang]) return Promise.resolve(dictionaries[lang]);
    var viaBundle = function () {
      return loadBundleScript().then(function (all) {
        if (!all[lang]) throw new Error('missing ' + lang);
        dictionaries[lang] = all[lang];
        return all[lang];
      });
    };
    if (global.location.protocol === 'file:' || typeof fetch !== 'function') return viaBundle();
    return fetch('translations/' + lang + '.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (json) { dictionaries[lang] = json; return json; })
      .catch(viaBundle);
  }

  /* ---------- lookup ---------- */
  function lookup(dict, key) {
    var parts = key.split('.');
    var cur = dict;
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interpolate(str, params) {
    if (!params) return str;
    return String(str).replace(/\{(\w+)\}/g, function (m, name) {
      return Object.prototype.hasOwnProperty.call(params, name) ? params[name] : m;
    });
  }

  /**
   * t(key, params) → translated string in the active language.
   * - Returns arrays/objects as-is (for lists).
   * - Missing key → "⟦key⟧" so it is visible in testing (never silently English/Arabic).
   * - Explicit null value → "no reliable translation" notice (never invent content).
   */
  function t(key, params) {
    var dict = dictionaries[state.lang] || {};
    var val = lookup(dict, key);
    if (val === undefined) {
      if (global.console) console.warn('[i18n] missing key', state.lang, key);
      return '⟦' + key + '⟧';
    }
    if (val === null) return lookup(dict, 'common.translationUnavailable');
    if (typeof val === 'string') return interpolate(val, params);
    return val;
  }

  function isUnavailable(key) {
    return lookup(dictionaries[state.lang] || {}, key) === null;
  }

  function readParams(el) {
    var raw = el.getAttribute('data-i18n-params');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  /* ---------- DOM application ---------- */
  /** Translate a single node: its text (data-i18n) and/or attributes (data-i18n-attr). */
  function translateNode(el) {
    var params = readParams(el);
    var key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key, params);
      el.classList.toggle('i18n-unavailable', isUnavailable(key));
    }
    var attrSpec = el.getAttribute('data-i18n-attr');
    if (attrSpec) {
      // format: "placeholder:key|aria-label:key2"
      attrSpec.split('|').forEach(function (pair) {
        var idx = pair.indexOf(':');
        if (idx < 1) return;
        el.setAttribute(pair.slice(0, idx).trim(), t(pair.slice(idx + 1).trim(), params));
      });
    }
  }

  function apply(root) {
    root = root || document;
    if (root.nodeType === 1 && (root.hasAttribute('data-i18n') || root.hasAttribute('data-i18n-attr'))) translateNode(root);
    var nodes = root.querySelectorAll('[data-i18n], [data-i18n-attr]');
    for (var i = 0; i < nodes.length; i++) translateNode(nodes[i]);
  }

  /** Bind a node to a key (+params) so it re-translates automatically on language change. */
  function bind(el, key, params) {
    el.setAttribute('data-i18n', key);
    if (params) el.setAttribute('data-i18n-params', JSON.stringify(params));
    else el.removeAttribute('data-i18n-params');
    el.textContent = t(key, params);
    el.classList.toggle('i18n-unavailable', isUnavailable(key));
    return el;
  }

  function updateDocumentMeta() {
    var html = document.documentElement;
    html.setAttribute('lang', state.lang);
    html.setAttribute('dir', t('meta.dir'));
    document.title = t('meta.titleFormat', { page: t(state.titleKey), site: t('meta.siteName') });
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', t('meta.description'));
    var ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.setAttribute('content', state.lang === 'ar' ? 'ar_JO' : 'en_US');
  }

  function setTitleKey(key) {
    state.titleKey = key;
    updateDocumentMeta();
  }

  function emit(prev) {
    var detail = { lang: state.lang, previous: prev, dir: t('meta.dir') };
    listeners.slice().forEach(function (fn) { try { fn(detail); } catch (e) { console.error(e); } });
    try { document.dispatchEvent(new CustomEvent('languagechange:rabadh', { detail: detail })); } catch (e) {}
  }

  /** The central language switch. Keeps current route & scroll position. */
  function setLanguage(lang, opts) {
    opts = opts || {};
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    var prev = state.lang;
    var scrollY = global.scrollY;
    return loadDictionary(lang).then(function () {
      state.lang = lang;
      if (opts.persist !== false) save(lang);
      updateDocumentMeta();
      apply(document);
      emit(prev);
      // Direction change can shift layout; keep the reader where they were.
      if (opts.keepScroll !== false) global.scrollTo(0, scrollY);
      return lang;
    });
  }

  function init() {
    var initial = readSaved() || DEFAULT_LANG;
    return setLanguage(initial, { persist: false, keepScroll: false }).catch(function () {
      // Last resort: try the default language
      return setLanguage(DEFAULT_LANG, { persist: false, keepScroll: false });
    });
  }

  global.I18n = {
    SUPPORTED: SUPPORTED,
    DEFAULT_LANG: DEFAULT_LANG,
    STORAGE_KEY: STORAGE_KEY,
    init: init,
    setLanguage: setLanguage,
    t: t,
    apply: apply,
    translateNode: translateNode,
    bind: bind,
    setTitleKey: setTitleKey,
    isUnavailable: isUnavailable,
    get lang() { return state.lang; },
    get dir() { return t('meta.dir'); },
    onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; },
    // exposed for automated tests
    _dictionaries: dictionaries,
    _lookup: lookup
  };
})(window);
