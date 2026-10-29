/* links.js — Suspicious link indicator checker (text-only, never opens the link) */
(function (global) {
  'use strict';
  var UI = global.RabadhUI, I18n = global.I18n, el = UI.el, A = global.RabadhUrl;

  var EXAMPLES = {
    safe: 'https://www.example.org/heritage/ajloun-castle',
    suspicious: 'http://192.168.10.5/archive/verify-login.exe?next=https://paypa1-secure.example.xyz'
  };

  function render(view) {
    var input = el('input', {
      type: 'text', id: 'link-input', class: 'input input--mono', dir: 'ltr', inputmode: 'url',
      autocomplete: 'off', spellcheck: 'false', autocapitalize: 'off', i18nAttr: 'placeholder:links.inputPlaceholder'
    });
    var status = el('div', { class: 'status-msg', id: 'link-status', role: 'status', hidden: true });
    var results = el('div', { class: 'link-results', id: 'link-results', 'aria-live': 'polite' });

    function run() {
      results.innerHTML = '';
      var r = A.analyze(input.value);
      if (!r.ok) {
        UI.setStatus(status, 'links.errors.' + r.error, 'error', r.max ? { max: r.max } : null);
        input.setAttribute('aria-invalid', 'true');
        return;
      }
      input.removeAttribute('aria-invalid');
      UI.setStatus(status, null);
      results.appendChild(renderResult(r));
    }

    function renderResult(r) {
      var meter = el('div', { class: 'meter meter--' + r.level, role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(r.score), i18nAttr: 'aria-label:links.score' },
        el('span', { class: 'meter__fill', style: 'inline-size:' + Math.max(4, r.score) + '%' }));

      var partsDl = el('dl', { class: 'kv kv--parts' }, ['scheme', 'host', 'port', 'path', 'query'].map(function (k) {
        var v = r.parts[k];
        if (!v || (k === 'path' && v === '/')) return null;
        return el('div', null, [el('dt', { i18n: 'links.parts.' + k }), el('dd', { class: 'url-content mono', dir: 'ltr', text: v })]);
      }));

      var indicators = r.indicators.length
        ? el('ul', { class: 'indicators' }, r.indicators.map(function (ind) {
          return el('li', { class: 'indicator indicator--' + ind.severity, 'data-indicator': ind.id }, [
            el('div', { class: 'indicator__head' }, [
              el('h4', { class: 'indicator__title', i18n: 'links.indicators.' + ind.id + '.title' }),
              el('span', { class: 'sev sev--' + ind.severity, i18n: 'links.severity.' + ind.severity })
            ]),
            el('p', { class: 'indicator__desc', i18n: 'links.indicators.' + ind.id + '.desc' }),
            ind.evidence ? el('p', { class: 'indicator__evidence' }, [
              el('span', { i18n: 'links.evidence' }), ' ',
              el('code', { class: 'url-content', dir: 'ltr', text: ind.evidence })
            ]) : null
          ]);
        }))
        : el('p', { class: 'status-msg status-msg--success' }, [UI.icon('check'), el('span', { i18n: 'links.none' })]);

      return el('article', { class: 'card result-card result-card--' + r.level, 'data-level': r.level }, [
        el('h2', { class: 'result-card__title', i18n: 'links.resultTitle' }),
        el('div', { class: 'result-card__level' }, [
          el('span', { class: 'level-pill level-pill--' + r.level }, [UI.icon(r.level === 'low' ? 'check' : 'alert', 'icon--sm'), el('span', { i18n: 'links.levels.' + r.level })]),
          el('span', { class: 'score' }, [el('span', { i18n: 'links.score' }), el('span', { class: 'num', text: ': ' + r.score + '/100' })])
        ]),
        meter,
        el('p', { class: 'result-card__summary', i18n: 'links.summary.' + r.level }),
        el('div', { class: 'analyzed' }, [
          el('p', { class: 'field__label', i18n: 'links.analyzed' }),
          el('code', { class: 'analyzed__url url-content', dir: 'ltr', id: 'analyzed-url', text: r.input })
        ]),
        r.assumedScheme ? el('p', { class: 'note' }, [UI.icon('info', 'icon--sm'), el('span', { i18n: 'links.assumedScheme' })]) : null,
        el('h3', { class: 'sub-title' }, [el('span', { i18n: 'links.indicatorsTitle' }), el('span', { class: 'num', text: ' (' + r.indicators.length + ')' })]),
        indicators,
        el('details', { class: 'help-box' }, [el('summary', null, el('span', { i18n: 'links.partsTitle' })), partsDl])
      ]);
    }

    var form = el('form', { class: 'card link-form', novalidate: true, onsubmit: function (e) { e.preventDefault(); run(); } }, [
      el('div', { class: 'field' }, [
        el('label', { for: 'link-input', class: 'field__label', i18n: 'links.inputLabel' }),
        el('div', { class: 'input-row' }, [
          input,
          el('button', { type: 'submit', class: 'btn btn--primary', id: 'link-analyze' }, [UI.icon('search', 'icon--sm'), el('span', { i18n: 'links.analyze' })]),
          el('button', { type: 'button', class: 'btn btn--ghost', id: 'link-clear', onclick: function () { input.value = ''; results.innerHTML = ''; UI.setStatus(status, null); input.removeAttribute('aria-invalid'); input.focus(); } },
            el('span', { i18n: 'links.clear' }))
        ])
      ]),
      el('div', { class: 'examples' }, [
        el('span', { class: 'muted', i18n: 'links.examplesTitle' }),
        el('button', { type: 'button', class: 'chip-btn', id: 'example-safe', onclick: function () { input.value = EXAMPLES.safe; run(); } }, el('span', { i18n: 'links.exampleSafe' })),
        el('button', { type: 'button', class: 'chip-btn', id: 'example-suspicious', onclick: function () { input.value = EXAMPLES.suspicious; run(); } }, el('span', { i18n: 'links.exampleSuspicious' }))
      ]),
      el('p', { class: 'privacy-note' }, [UI.icon('shield', 'icon--sm'), el('span', { i18n: 'links.disclaimer' })]),
      status
    ]);

    view.appendChild(el('section', { class: 'section' }, el('div', { class: 'container' }, [
      UI.pageHeader('links.title', 'links.intro', 'link'),
      el('div', { class: 'tool-layout' }, [
        el('div', { class: 'tool-main' }, [form, results]),
        el('aside', { class: 'tool-side' }, [
          el('div', { class: 'card card--soft' }, [el('h2', { class: 'side-title', i18n: 'links.howTitle' }), UI.boundList('ol', 'links.how', 'steps')]),
          el('div', { class: 'card card--soft' }, [el('h2', { class: 'side-title', i18n: 'links.tipsTitle' }), UI.boundList('ul', 'links.tips', 'tick-list')])
        ])
      ])
    ])));
  }

  global.RabadhPages.links = { render: render };
})(window);
