/*
 * ui.js — Small DOM helpers, icons, toasts and an accessible modal.
 * Every visible string is bound to a translation key, so all UI pieces
 * (including popups and toasts that are open) re-translate on language change.
 */
(function (global) {
  'use strict';
  var I18n = global.I18n;

  /* ---------- element builder ----------
   * el('p', { i18n: 'home.intro', class: 'lead' })
   * el('input', { i18nAttr: 'placeholder:library.searchPlaceholder' })
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'i18n') I18n.bind(node, v, attrs.i18nParams);
      else if (k === 'i18nParams') { /* handled with i18n */ }
      else if (k === 'i18nAttr') { node.setAttribute('data-i18n-attr', v); }
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v; // only used for trusted, static SVG icons
      else if (k.indexOf('on') === 0 && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else node.setAttribute(k, v === true ? '' : v);
    });
    if (attrs.i18nAttr) {
      if (attrs.i18nParams && !attrs.i18n) node.setAttribute('data-i18n-params', JSON.stringify(attrs.i18nParams));
      I18n.translateNode(node);
    }
    appendChildren(node, children);
    return node;
  }
  function appendChildren(node, children) {
    if (children === undefined || children === null) return;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
  }

  /* ---------- icons (original, inline SVG; decorative => aria-hidden) ---------- */
  var ICON_PATHS = {
    castle: '<path d="M4 21V9l2-1V5h2v2h2V5h4v2h2V5h2v3l2 1v12"/><path d="M4 21h16"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/><path d="M8 12h.01M16 12h.01"/>',
    map: '<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5z"/><path d="M4 19a2 2 0 0 1 2-2h13"/><path d="M9 7h6"/>',
    fingerprint: '<path d="M12 11v3a8 8 0 0 1-1.5 4.7"/><path d="M8.5 9.5A4 4 0 0 1 16 11v1.5a12 12 0 0 1-.6 3.7"/><path d="M5.6 7.5A8 8 0 0 1 20 11v1"/><path d="M5 11a7 7 0 0 0 0 .5V13a9 9 0 0 1-1 4"/><path d="M8 13v.5a10 10 0 0 1-1.6 5.5"/><path d="M19.5 16.5c-.2 1-.5 1.9-.9 2.8"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3z"/><path d="m9 12 2 2 4-4"/>',
    game: '<path d="M6 8h12a4 4 0 0 1 4 4v2a3 3 0 0 1-5.4 1.8L15 14H9l-1.6 1.8A3 3 0 0 1 2 14v-2a4 4 0 0 1 4-4z"/><path d="M7 11v2M6 12h2"/><path d="M16 11h.01M18 13h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<path d="m5 12 4 4 10-10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<path d="M12 4 2 20h20L12 4z"/><path d="M12 10v4M12 17h.01"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    scroll: '<path d="M7 4h11a2 2 0 0 1 2 2v1H9"/><path d="M7 4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1H9v1a2 2 0 0 1-2 2"/><path d="M9 7v10"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    column: '<path d="M5 21h14M6 4h12M7 4v17M17 4v17M12 4v17"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.6L20 8"/><path d="M20 3v5h-5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14a5 5 0 0 1 5.5 5"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'
  };
  function icon(name, cls) {
    var span = document.createElement('span');
    span.className = 'icon' + (cls ? ' ' + cls : '');
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" focusable="false">' + (ICON_PATHS[name] || '') + '</svg>';
    return span;
  }

  /* ---------- toasts ---------- */
  function toast(key, params, type) {
    var region = document.getElementById('toast-region');
    if (!region) return;
    var item = el('div', { class: 'toast toast--' + (type || 'info'), role: 'status' }, [
      icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info'),
      el('span', { i18n: key, i18nParams: params })
    ]);
    region.appendChild(item);
    requestAnimationFrame(function () { item.classList.add('is-visible'); });
    setTimeout(function () {
      item.classList.remove('is-visible');
      setTimeout(function () { item.remove(); }, 300);
    }, 3200);
  }

  /* ---------- status message (inline, re-translatable) ---------- */
  function setStatus(node, key, type, params) {
    node.className = 'status-msg' + (type ? ' status-msg--' + type : '');
    node.innerHTML = '';
    if (!key) { node.hidden = true; return; }
    node.hidden = false;
    node.appendChild(icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : type === 'warning' ? 'alert' : 'info'));
    node.appendChild(el('span', { i18n: key, i18nParams: params }));
  }

  /* ---------- modal ---------- */
  var activeModal = null;
  function openModal(opts) {
    closeModal();
    var root = document.getElementById('modal-root');
    var lastFocus = document.activeElement;
    var titleId = 'modal-title-' + Date.now();
    var closeBtn = el('button', { class: 'icon-btn modal__close', type: 'button', i18nAttr: 'aria-label:common.close|title:common.close', onclick: function () { closeModal(); } }, icon('close'));
    var actions = el('div', { class: 'modal__actions' });
    (opts.actions || [{ key: 'common.close', variant: 'primary' }]).forEach(function (a) {
      actions.appendChild(el('button', {
        type: 'button', class: 'btn btn--' + (a.variant || 'ghost'), i18n: a.key,
        onclick: function () { if (a.onClick) a.onClick(); if (a.keepOpen !== true) closeModal(); }
      }));
    });
    var dialog = el('div', { class: 'modal__dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId, tabindex: '-1' }, [
      el('div', { class: 'modal__head' }, [el('h2', { id: titleId, class: 'modal__title', i18n: opts.titleKey, i18nParams: opts.titleParams }), closeBtn]),
      el('div', { class: 'modal__body' }, opts.body),
      actions
    ]);
    var overlay = el('div', { class: 'modal', onclick: function (e) { if (e.target === overlay) closeModal(); } }, dialog);
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key !== 'Tab') return;
      var f = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    root.appendChild(overlay);
    document.body.classList.add('has-modal');
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
    var focusTarget = actions.querySelector('.btn--primary') || closeBtn;
    focusTarget.focus({ preventScroll: true });
    activeModal = { overlay: overlay, onKey: onKey, lastFocus: lastFocus, onClose: opts.onClose };
    return closeModal;
  }
  function closeModal() {
    if (!activeModal) return;
    var m = activeModal; activeModal = null;
    document.removeEventListener('keydown', m.onKey);
    m.overlay.remove();
    document.body.classList.remove('has-modal');
    if (m.lastFocus && m.lastFocus.focus) m.lastFocus.focus({ preventScroll: true });
    if (m.onClose) m.onClose();
  }

  /* ---------- shared content helpers ---------- */
  function statusBadge(status) {
    return el('span', { class: 'badge badge--' + status }, [
      el('span', { class: 'visually-hidden', i18n: 'common.statusLabel' }),
      el('span', { class: 'visually-hidden', text: ': ' }),
      el('span', { i18n: 'status.' + status })
    ]);
  }

  function sourcesList(ids) {
    if (!ids || !ids.length) return null;
    var S = global.RabadhContent.SOURCES;
    return el('div', { class: 'sources' }, [
      el('h3', { class: 'sources__title', i18n: 'common.sources' }),
      el('ul', { class: 'sources__list' }, ids.map(function (id) {
        return el('li', null, el('a', { href: S[id], target: '_blank', rel: 'noopener noreferrer', class: 'ext-link' }, [
          el('span', { i18n: 'about.sources.' + id + '.name' }),
          el('span', { class: 'visually-hidden', i18n: 'common.newTab' }),
          icon('external', 'icon--sm')
        ]));
      }))
    ]);
  }

  /** List of <li> bound to an array in the dictionary (e.g. tour.help) */
  function boundList(tag, key, cls) {
    var arr = I18n.t(key);
    var list = el(tag, { class: cls || '' });
    (Array.isArray(arr) ? arr : []).forEach(function (_, i) { list.appendChild(el('li', { i18n: key + '.' + i })); });
    return list;
  }

  function formatBytes(n) {
    if (n < 1024) return { v: String(n), unit: 'units.bytes' };
    if (n < 1024 * 1024) return { v: (n / 1024).toFixed(1), unit: 'units.kb' };
    return { v: (n / 1048576).toFixed(1), unit: 'units.mb' };
  }

  function pageHeader(titleKey, introKey, iconName) {
    return el('header', { class: 'page-head' }, [
      el('div', { class: 'page-head__icon' }, icon(iconName || 'castle')),
      el('div', null, [
        el('h1', { class: 'page-head__title', i18n: titleKey, tabindex: '-1', id: 'page-title' }),
        introKey ? el('p', { class: 'page-head__intro', i18n: introKey }) : null
      ])
    ]);
  }

  global.RabadhUI = {
    el: el, icon: icon, toast: toast, setStatus: setStatus,
    openModal: openModal, closeModal: closeModal,
    statusBadge: statusBadge, sourcesList: sourcesList, boundList: boundList,
    formatBytes: formatBytes, pageHeader: pageHeader
  };
})(window);
