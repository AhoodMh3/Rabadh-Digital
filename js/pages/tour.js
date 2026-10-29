/* tour.js — Virtual tour of Ajloun Castle (8 stops on an illustrative plan) */
(function (global) {
  'use strict';
  var UI = global.RabadhUI, I18n = global.I18n, el = UI.el;
  var STOPS = global.RabadhContent.TOUR;
  var SVGNS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  function buildMap(onSelect) {
    var root = svg('svg', { viewBox: '0 0 400 300', class: 'tour-map__svg', focusable: 'false' });
    svg('rect', { x: 0, y: 0, width: 400, height: 300, rx: 18, class: 'map-bg' }, root);
    [[190, 140], [165, 120], [140, 100]].forEach(function (r) {
      svg('ellipse', { cx: 200, cy: 150, rx: r[0], ry: r[1], class: 'map-contour' }, root);
    });
    svg('rect', { x: 92, y: 56, width: 216, height: 182, rx: 46, class: 'map-moat' }, root);
    svg('rect', { x: 300, y: 124, width: 40, height: 16, rx: 3, class: 'map-bridge' }, root);
    svg('path', { d: 'M126 84 H274 V204 H126 Z', class: 'map-keep' }, root);
    svg('path', { d: 'M150 108 H250 V180 H150 Z', class: 'map-court' }, root);
    [[114, 72], [262, 72], [114, 192]].forEach(function (p) {
      svg('rect', { x: p[0], y: p[1], width: 24, height: 24, rx: 3, class: 'map-tower' }, root);
    });
    svg('rect', { x: 246, y: 188, width: 46, height: 40, rx: 4, class: 'map-tower map-tower--aybak' }, root);
    svg('path', { d: 'M300 132 H284 V150 H272', class: 'map-path' }, root);
    // north arrow (plan is geographic: never mirrored)
    var north = svg('g', { class: 'map-north', transform: 'translate(372 30)' }, root);
    svg('circle', { r: 14, class: 'map-north__ring' }, north);
    svg('path', { d: 'M0 -10 L6 6 L0 2 L-6 6 Z', class: 'map-north__arrow' }, north);

    var hotspots = STOPS.map(function (s, i) {
      var g = svg('g', { class: 'hotspot', role: 'button', tabindex: '0', transform: 'translate(' + s.x + ' ' + s.y + ')', 'data-index': i }, root);
      svg('circle', { r: 16, class: 'hotspot__pulse' }, g);
      svg('circle', { r: 12, class: 'hotspot__dot' }, g);
      var t = svg('text', { class: 'hotspot__num', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
      t.textContent = String(i + 1);
      g.addEventListener('click', function () { onSelect(i); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(i); }
      });
      return g;
    });
    return { root: root, hotspots: hotspots };
  }

  function render(view, ctx) {
    var idx = Math.min(Math.max(parseInt(ctx.params.s, 10) - 1 || 0, 0), STOPS.length - 1);

    var panel = el('article', { class: 'stop card', 'aria-live': 'polite' });
    var map = buildMap(function (i) { go(i, true); });

    var progress = el('p', { class: 'stop__progress' });
    var dots = el('ol', { class: 'stop__dots' }, STOPS.map(function (s, i) {
      return el('li', null, el('button', { type: 'button', class: 'dot', 'data-index': i, onclick: function () { go(i, true); } },
        el('span', { class: 'visually-hidden', i18n: 'tour.stationAria', i18nParams: { n: i + 1, title: '' } })));
    }));
    var prevBtn = el('button', { type: 'button', class: 'btn btn--ghost', onclick: function () { go(idx - 1, true); } },
      [UI.icon('arrow', 'icon--dir icon--back'), el('span', { i18n: 'tour.prev' })]);
    var nextBtn = el('button', { type: 'button', class: 'btn btn--primary', onclick: function () { go(idx + 1, true); } },
      [el('span', { i18n: 'tour.next' }), UI.icon('arrow', 'icon--dir')]);
    var finish = el('div', { class: 'stop__finish', hidden: true }, [
      el('p', { i18n: 'tour.finished' }),
      el('div', { class: 'btn-row' }, [
        el('a', { class: 'btn btn--primary', href: '#/game' }, [UI.icon('game'), el('span', { i18n: 'tour.toGame' })]),
        el('button', { type: 'button', class: 'btn btn--ghost', onclick: function () { go(0, true); } }, [UI.icon('refresh'), el('span', { i18n: 'tour.restart' })])
      ])
    ]);

    var content = el('div', { class: 'stop__content' });

    function stationTitle(i) { return I18n.t('tour.stations.' + STOPS[i].id + '.title'); }

    function updateLabels() {
      map.hotspots.forEach(function (g, i) {
        g.setAttribute('aria-label', I18n.t('tour.stationAria', { n: i + 1, title: stationTitle(i) }));
      });
      dots.querySelectorAll('.dot .visually-hidden').forEach(function (sp, i) {
        I18n.bind(sp, 'tour.stationAria', { n: i + 1, title: stationTitle(i) });
      });
    }

    function go(i, userAction) {
      if (i < 0 || i >= STOPS.length) return;
      idx = i;
      var s = STOPS[i], base = 'tour.stations.' + s.id;
      content.innerHTML = '';
      content.appendChild(el('div', { class: 'stop__meta' }, [
        el('span', { class: 'chip chip--era', i18n: base + '.era' }),
        UI.statusBadge(s.status)
      ]));
      content.appendChild(el('h2', { class: 'stop__title', i18n: base + '.title', tabindex: '-1' }));
      content.appendChild(el('p', { class: 'stop__body', i18n: base + '.body' }));
      content.appendChild(el('aside', { class: 'callout' }, [
        el('p', { class: 'callout__label' }, [UI.icon('info', 'icon--sm'), el('span', { i18n: 'common.fact' })]),
        el('p', { i18n: base + '.fact' })
      ]));
      content.appendChild(UI.sourcesList(s.sources));

      I18n.bind(progress, 'tour.progress', { n: i + 1, total: STOPS.length });
      map.hotspots.forEach(function (g, j) {
        g.classList.toggle('is-active', j === i);
        g.classList.toggle('is-visited', j < i);
        if (j === i) g.setAttribute('aria-current', 'step'); else g.removeAttribute('aria-current');
      });
      dots.querySelectorAll('.dot').forEach(function (d, j) {
        d.classList.toggle('is-active', j === i);
        if (j === i) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
      });
      prevBtn.disabled = i === 0;
      nextBtn.hidden = i === STOPS.length - 1;
      finish.hidden = i !== STOPS.length - 1;
      ctx.replaceParams({ s: i + 1 });
      if (userAction) {
        var h = content.querySelector('.stop__title');
        if (h && global.matchMedia('(max-width: 900px)').matches) h.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }

    panel.appendChild(el('div', { class: 'stop__top' }, [progress, dots]));
    panel.appendChild(content);
    panel.appendChild(el('div', { class: 'stop__controls' }, [prevBtn, nextBtn]));
    panel.appendChild(finish);

    var mapFigure = el('figure', { class: 'tour-map card' }, [
      el('figcaption', { class: 'tour-map__caption' }, [
        el('h2', { class: 'tour-map__title', i18n: 'tour.mapTitle' }),
        el('p', { class: 'tour-map__note', i18n: 'tour.mapNote' })
      ])
    ]);
    var mapWrap = el('div', { class: 'tour-map__frame', dir: 'ltr', role: 'group', i18nAttr: 'aria-label:tour.mapLabel' });
    mapWrap.appendChild(map.root);
    mapFigure.insertBefore(mapWrap, mapFigure.firstChild);

    var layout = el('div', { class: 'tour-layout' }, [mapFigure, panel]);
    layout.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      var forwardKey = I18n.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
      e.preventDefault();
      go(e.key === forwardKey ? idx + 1 : idx - 1, false);
      var active = map.hotspots[idx];
      if (document.activeElement && document.activeElement.classList.contains('hotspot')) active.focus();
    });

    view.appendChild(el('section', { class: 'section' }, el('div', { class: 'container' }, [
      UI.pageHeader('tour.title', 'tour.intro', 'map'),
      el('details', { class: 'help-box' }, [
        el('summary', null, [UI.icon('info', 'icon--sm'), el('span', { i18n: 'tour.helpTitle' })]),
        UI.boundList('ul', 'tour.help', 'help-box__list')
      ]),
      layout
    ])));

    go(idx, false);
    updateLabels();
    ctx.onLang(updateLabels);
  }

  global.RabadhPages.tour = { render: render };
})(window);
