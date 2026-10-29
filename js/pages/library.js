/* library.js — Digital heritage library (search + category filter + detail popup) */
(function (global) {
  'use strict';
  var UI = global.RabadhUI, I18n = global.I18n, el = UI.el;
  var C = global.RabadhContent;
  var CAT_ICON = { history: 'scroll', architecture: 'column', people: 'person', documents: 'book', digital: 'archive' };

  /** Normalise for search: lower-case, strip Arabic diacritics/tatweel, unify alef/ya/ta-marbuta forms. */
  function norm(s) {
    return String(s || '').toLowerCase()
      .replace(/[ً-ْٰـ]/g, '')
      .replace(/[إأآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/[ʿʾ‘’'`]/g, '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function openDetails(item) {
    var base = 'library.items.' + item.id;
    var body = el('div', { class: 'lib-detail' }, [
      el('div', { class: 'stop__meta' }, [
        el('span', { class: 'chip' }, [UI.icon(CAT_ICON[item.category], 'icon--sm'), el('span', { i18n: 'library.categories.' + item.category })]),
        UI.statusBadge(item.status)
      ]),
      el('p', { i18n: base + '.body' }),
      UI.sourcesList(item.sources),
      item.tool ? el('a', { class: 'btn btn--outline', href: '#/' + item.tool, onclick: function () { UI.closeModal(); } },
        [UI.icon('fingerprint'), el('span', { i18n: 'library.tryTool' })]) : null
    ]);
    UI.openModal({ titleKey: base + '.title', body: body });
  }

  function render(view, ctx) {
    var state = { q: '', cat: 'all' };

    var search = el('input', {
      type: 'search', id: 'lib-search', class: 'input', autocomplete: 'off',
      i18nAttr: 'placeholder:library.searchPlaceholder'
    });
    var chips = el('div', { class: 'chips', role: 'group', i18nAttr: 'aria-label:library.filtersLabel' },
      C.LIBRARY_CATEGORIES.map(function (c) {
        return el('button', { type: 'button', class: 'chip-btn', 'data-cat': c, 'aria-pressed': c === 'all' ? 'true' : 'false',
          onclick: function () { state.cat = c; update(); } }, el('span', { i18n: 'library.categories.' + c }));
      }));
    var count = el('p', { class: 'lib-count', role: 'status' });
    var empty = el('div', { class: 'empty', hidden: true }, [
      UI.icon('search'), el('p', { i18n: 'library.noResults' }),
      el('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: function () { search.value = ''; state.q = ''; state.cat = 'all'; update(); search.focus(); } },
        el('span', { i18n: 'library.clearSearch' }))
    ]);

    var cards = C.LIBRARY.map(function (item) {
      var base = 'library.items.' + item.id;
      var card = el('li', { class: 'lib-card card', 'data-id': item.id, 'data-cat': item.category }, [
        el('div', { class: 'lib-card__top' }, [
          el('span', { class: 'lib-card__icon' }, UI.icon(CAT_ICON[item.category])),
          el('span', { class: 'chip chip--sm', i18n: 'library.categories.' + item.category })
        ]),
        el('h2', { class: 'lib-card__title', i18n: base + '.title' }),
        el('p', { class: 'lib-card__summary', i18n: base + '.summary' }),
        el('div', { class: 'lib-card__foot' }, [
          UI.statusBadge(item.status),
          el('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: function () { openDetails(item); } }, [
            el('span', { i18n: 'common.details' }), UI.icon('arrow', 'icon--dir icon--sm')
          ])
        ])
      ]);
      return { item: item, node: card };
    });
    var grid = el('ul', { class: 'lib-grid' }, cards.map(function (c) { return c.node; }));

    function matches(item) {
      if (state.cat !== 'all' && item.category !== state.cat) return false;
      if (!state.q) return true;
      var base = 'library.items.' + item.id;
      var hay = norm([I18n.t(base + '.title'), I18n.t(base + '.summary'), I18n.t(base + '.body'), I18n.t('library.categories.' + item.category)].join(' '));
      return norm(state.q).split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) !== -1; });
    }

    function update() {
      var shown = 0;
      cards.forEach(function (c) { var ok = matches(c.item); c.node.hidden = !ok; if (ok) shown++; });
      chips.querySelectorAll('[data-cat]').forEach(function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-cat') === state.cat ? 'true' : 'false');
      });
      I18n.bind(count, 'library.count', { n: shown });
      empty.hidden = shown !== 0;
    }

    search.addEventListener('input', function () { state.q = search.value.trim(); update(); });

    view.appendChild(el('section', { class: 'section' }, el('div', { class: 'container' }, [
      UI.pageHeader('library.title', 'library.intro', 'book'),
      el('div', { class: 'toolbar card' }, [
        el('div', { class: 'field field--search' }, [
          el('label', { for: 'lib-search', class: 'field__label', i18n: 'library.searchLabel' }),
          el('div', { class: 'input-icon' }, [UI.icon('search', 'icon--sm'), search])
        ]),
        el('div', { class: 'field' }, [el('span', { class: 'field__label', i18n: 'library.filtersLabel' }), chips])
      ]),
      count,
      grid,
      empty
    ])));
    update();
    ctx.onLang(update);
  }

  global.RabadhPages.library = { render: render };
})(window);
