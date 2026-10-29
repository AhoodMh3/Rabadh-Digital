/* awareness.js — Cybersecurity awareness center */
(function (global) {
  'use strict';
  var UI = global.RabadhUI, I18n = global.I18n, el = UI.el;
  var TOPIC_ICON = { phishing: 'alert', passwords: 'key', mfa: 'shield', updates: 'refresh', backup: 'archive', social: 'users', integrity: 'fingerprint', heritage: 'castle' };

  function render(view) {
    var topics = global.RabadhContent.AWARENESS_TOPICS.map(function (id) {
      var base = 'awareness.topics.' + id;
      var listId = 'tips-' + id;
      var label = el('span', { i18n: 'awareness.showTips' });
      var tips = UI.boundList('ul', base + '.tips', 'tick-list');
      tips.id = listId; tips.hidden = true;
      var btn = el('button', { type: 'button', class: 'btn btn--ghost btn--sm topic__toggle', 'aria-expanded': 'false', 'aria-controls': listId }, [label, el('span', { class: 'caret', 'aria-hidden': 'true' })]);
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        tips.hidden = !open;
        I18n.bind(label, open ? 'awareness.hideTips' : 'awareness.showTips');
      });
      return el('li', { class: 'topic card', 'data-topic': id }, [
        el('div', { class: 'topic__head' }, [
          el('span', { class: 'topic__icon' }, UI.icon(TOPIC_ICON[id])),
          el('div', null, [el('h3', { class: 'topic__title', i18n: base + '.title' }), el('p', { class: 'topic__summary', i18n: base + '.summary' })])
        ]),
        btn, tips
      ]);
    });

    var items = I18n.t('awareness.checklist');
    var total = Array.isArray(items) ? items.length : 0;
    var progressText = el('p', { class: 'check-progress__text', role: 'status' });
    var bar = el('span', { class: 'progress__fill' });
    var progress = el('div', { class: 'progress', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': '0' }, bar);
    var level = el('p', { class: 'check-progress__level' });
    var boxes = [];
    var list = el('ul', { class: 'checklist' }, (items || []).map(function (_, i) {
      var id = 'chk-' + i;
      var box = el('input', { type: 'checkbox', id: id, class: 'checkbox' });
      box.addEventListener('change', update);
      boxes.push(box);
      return el('li', null, [box, el('label', { for: id, i18n: 'awareness.checklist.' + i })]);
    }));
    function update() {
      var done = boxes.filter(function (b) { return b.checked; }).length;
      I18n.bind(progressText, 'awareness.progress', { done: done, total: total });
      progress.setAttribute('aria-valuenow', String(done));
      I18n.translateNode(progress);
      bar.style.inlineSize = (total ? (done / total) * 100 : 0) + '%';
      I18n.bind(level, done === total ? 'awareness.levels.done' : done >= total / 2 ? 'awareness.levels.mid' : 'awareness.levels.start');
    }
    progress.setAttribute('data-i18n-attr', 'aria-label:awareness.checklistTitle');

    view.appendChild(el('section', { class: 'section' }, el('div', { class: 'container' }, [
      UI.pageHeader('awareness.title', 'awareness.intro', 'shield'),
      el('h2', { class: 'section-title', i18n: 'awareness.topicsTitle' }),
      el('ul', { class: 'topic-grid' }, topics),
      el('div', { class: 'aw-bottom' }, [
        el('section', { class: 'card checklist-card', 'aria-labelledby': 'chk-title' }, [
          el('h2', { class: 'side-title', id: 'chk-title', i18n: 'awareness.checklistTitle' }),
          el('p', { class: 'muted', i18n: 'awareness.checklistIntro' }),
          list,
          el('div', { class: 'check-progress' }, [progressText, progress, level])
        ]),
        el('section', { class: 'card cta-card' }, [
          el('h2', { class: 'side-title', i18n: 'awareness.ctaTitle' }),
          el('p', { i18n: 'awareness.ctaBody' }),
          el('div', { class: 'btn-stack' }, [
            el('a', { class: 'btn btn--primary', href: '#/game' }, [UI.icon('game'), el('span', { i18n: 'awareness.ctaGame' })]),
            el('a', { class: 'btn btn--outline', href: '#/hash' }, [UI.icon('fingerprint'), el('span', { i18n: 'awareness.ctaHash' })]),
            el('a', { class: 'btn btn--outline', href: '#/links' }, [UI.icon('link'), el('span', { i18n: 'awareness.ctaLinks' })])
          ])
        ])
      ])
    ])));
    update();
  }

  global.RabadhPages.awareness = { render: render };
})(window);
