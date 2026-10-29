/*
 * app.js — Router, header (language switcher + mobile menu), footer and boot.
 * Routes are hash-based (#/tour?s=3) so switching language never navigates:
 * the user always stays on the same page, section and scroll position.
 */
(function (global) {
  'use strict';
  var I18n = global.I18n, UI = global.RabadhUI, Pages = global.RabadhPages;

  var ROUTES = {
    home: 'meta.pages.home', tour: 'meta.pages.tour', library: 'meta.pages.library',
    hash: 'meta.pages.hash', links: 'meta.pages.links', awareness: 'meta.pages.awareness',
    game: 'meta.pages.game', about: 'meta.pages.about'
  };

  var view = document.getElementById('view');
  var current = { route: null, cleanup: [] };

  function parseHash() {
    var raw = (global.location.hash || '').replace(/^#\/?/, '');
    var q = raw.indexOf('?');
    var route = (q === -1 ? raw : raw.slice(0, q)) || 'home';
    var params = {};
    if (q !== -1) raw.slice(q + 1).split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0]) params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
    return { route: route, params: params };
  }

  /** Update the hash params without re-rendering (used by tour to remember the stop). */
  function replaceParams(params) {
    var r = parseHash().route;
    var qs = Object.keys(params).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); }).join('&');
    var url = '#/' + r + (qs ? '?' + qs : '');
    try { global.history.replaceState(null, '', url); } catch (e) { /* ignore */ }
  }

  function render(isInitial) {
    var parsed = parseHash();
    var route = ROUTES[parsed.route] ? parsed.route : 'notFound';
    // cleanup previous page subscriptions
    current.cleanup.forEach(function (fn) { try { fn(); } catch (e) {} });
    current.cleanup = [];
    UI.closeModal();
    current.route = route;

    view.innerHTML = '';
    var ctx = {
      params: parsed.params,
      replaceParams: replaceParams,
      onLang: function (fn) { current.cleanup.push(I18n.onChange(fn)); },
      onCleanup: function (fn) { current.cleanup.push(fn); }
    };
    var page = Pages[route] || Pages.notFound;
    page.render(view, ctx);
    I18n.apply(view);
    I18n.setTitleKey(route === 'notFound' ? 'meta.pages.notFound' : ROUTES[route]);
    view.setAttribute('data-route', route);

    // nav state
    document.querySelectorAll('[data-route]').forEach(function (a) {
      if (a === view) return;
      if (a.getAttribute('data-route') === route) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    closeNav();
    if (!isInitial) {
      global.scrollTo(0, 0);
      var h = document.getElementById('page-title');
      if (h) h.focus({ preventScroll: true });
    }
  }

  /* ---------- language switcher ----------
   * Focus calls use preventScroll: the header is position:sticky and Chrome would
   * otherwise jump to the top of the page, losing the reader's place. */
  var langBtn = document.getElementById('lang-btn');
  var langMenu = document.getElementById('lang-menu');
  var langCurrent = document.getElementById('lang-current');

  function syncLangButton() {
    var lang = I18n.lang;
    langCurrent.textContent = I18n.t('lang.' + lang);
    langCurrent.setAttribute('lang', lang);
    langMenu.querySelectorAll('[data-lang]').forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-lang') === lang ? 'true' : 'false');
    });
  }
  function openLangMenu() {
    langMenu.hidden = false;
    langBtn.setAttribute('aria-expanded', 'true');
    var active = langMenu.querySelector('[aria-checked="true"]') || langMenu.querySelector('button');
    active.focus({ preventScroll: true });
  }
  function closeLangMenu(focusBtn) {
    if (langMenu.hidden) return;
    langMenu.hidden = true;
    langBtn.setAttribute('aria-expanded', 'false');
    if (focusBtn) langBtn.focus({ preventScroll: true });
  }
  langBtn.addEventListener('click', function () { langMenu.hidden ? openLangMenu() : closeLangMenu(); });
  langBtn.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openLangMenu(); }
  });
  langMenu.addEventListener('keydown', function (e) {
    var items = Array.prototype.slice.call(langMenu.querySelectorAll('button'));
    var i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus({ preventScroll: true }); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus({ preventScroll: true }); }
    else if (e.key === 'Escape') { e.preventDefault(); closeLangMenu(true); }
    else if (e.key === 'Tab') { closeLangMenu(); }
  });
  langMenu.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lang]');
    if (!b) return;
    var lang = b.getAttribute('data-lang');
    closeLangMenu(true);
    if (lang === I18n.lang) return;
    I18n.setLanguage(lang).then(function () {
      UI.toast('lang.changed', null, 'success');
    }).catch(function () { UI.toast('lang.loadError', null, 'error'); });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('#lang-switch')) closeLangMenu();
  });

  /* ---------- mobile navigation ---------- */
  var navToggle = document.getElementById('nav-toggle');
  var header = document.getElementById('site-header');
  function setNavLabel(open) {
    navToggle.setAttribute('data-i18n-attr', 'aria-label:' + (open ? 'nav.closeMenu' : 'nav.openMenu'));
    I18n.translateNode(navToggle);
  }
  function closeNav() {
    header.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
    setNavLabel(false);
  }
  navToggle.addEventListener('click', function () {
    var open = !header.classList.contains('nav-open');
    header.classList.toggle('nav-open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    setNavLabel(open);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('nav-open')) { closeNav(); navToggle.focus({ preventScroll: true }); }
  });

  /* ---------- footer ---------- */
  var rights = document.getElementById('footer-rights');
  rights.setAttribute('data-i18n-params', JSON.stringify({ year: new Date().getFullYear() }));
  document.getElementById('help-btn').addEventListener('click', function () {
    UI.openModal({ titleKey: 'about.helpTitle', body: Pages.about.helpContent() });
  });

  /* ---------- boot ---------- */
  I18n.onChange(syncLangButton);
  global.addEventListener('hashchange', function () { render(false); });
  I18n.init().then(function () {
    syncLangButton();
    render(true);
    document.documentElement.classList.add('is-ready');
  }).catch(function (err) {
    console.error(err);
    view.innerHTML = '<p class="boot-error" lang="ar" dir="rtl">تعذّر تحميل ملفات اللغة. شغّل الموقع عبر خادم محلي أو تأكد من وجود مجلد translations.</p>' +
      '<p class="boot-error" lang="en" dir="ltr">The language files could not be loaded. Serve the site over a local server or make sure the translations folder exists.</p>';
  });

  global.RabadhApp = { render: render, parseHash: parseHash };
})(window);
