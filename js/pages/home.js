/* home.js — Home page */
(function (global) {
  'use strict';
  var UI = global.RabadhUI, I18n = global.I18n, el = UI.el;
  global.RabadhPages = global.RabadhPages || {};

  // Original illustration made for the project (castle on Jabal ʿAuf + digital network).
  var HERO_SVG =
    '<svg viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
    '<defs><radialGradient id="hg-sun" cx="50%" cy="50%" r="50%"><stop offset="0" class="hero-sun-in"/><stop offset="1" class="hero-sun-out"/></radialGradient></defs>' +
    '<circle cx="372" cy="118" r="70" fill="url(#hg-sun)"/>' +
    '<g class="hero-net" fill="none" stroke-width="1.4">' +
      '<circle cx="262" cy="170" r="150" stroke-dasharray="3 7"/>' +
      '<circle cx="262" cy="170" r="205" stroke-dasharray="2 9" opacity=".6"/>' +
      '<path d="M262 92 L120 60 M262 92 L420 48 M262 92 L470 200 M262 92 L60 190"/>' +
    '</g>' +
    '<g class="hero-node">' +
      '<circle cx="120" cy="60" r="6"/><circle cx="420" cy="48" r="6"/><circle cx="470" cy="200" r="6"/><circle cx="60" cy="190" r="6"/>' +
    '</g>' +
    '<path class="hero-hill-back" d="M0 300 C90 230 160 250 240 228 C330 204 410 236 520 260 V420 H0 Z"/>' +
    '<path class="hero-hill" d="M0 340 C70 300 150 296 200 262 C230 242 300 240 330 262 C380 296 450 300 520 320 V420 H0 Z"/>' +
    '<g class="hero-castle">' +
      '<path d="M196 262 V170 h10 v-10 h10 v10 h10 v-10 h10 v10 h10 v-10 h10 v10 h10 V262 Z"/>' +
      '<path d="M176 262 V150 h8 v-10 h8 v10 h8 v-10 h8 v10 h8 V262 Z"/>' +
      '<path d="M268 262 V140 h8 v-12 h8 v12 h8 v-12 h8 v12 h8 V262 Z"/>' +
      '<path d="M300 262 V184 h8 v-10 h8 v10 h8 V262 Z"/>' +
    '</g>' +
    '<g class="hero-castle-shade">' +
      '<path d="M226 262 v-34 a10 10 0 0 1 20 0 v34 Z"/>' +
      '<rect x="186" y="170" width="6" height="14" rx="3"/><rect x="186" y="204" width="6" height="14" rx="3"/>' +
      '<rect x="281" y="160" width="6" height="14" rx="3"/><rect x="281" y="196" width="6" height="14" rx="3"/>' +
      '<rect x="212" y="188" width="6" height="12" rx="3"/><rect x="252" y="188" width="6" height="12" rx="3"/>' +
    '</g>' +
    '<g class="hero-beacon"><circle cx="292" cy="118" r="5"/><circle cx="292" cy="118" r="12" fill="none" stroke-width="1.5" opacity=".6"/></g>' +
    '<g class="hero-trees">' +
      '<circle cx="70" cy="320" r="18"/><circle cx="98" cy="312" r="14"/><circle cx="130" cy="300" r="12"/>' +
      '<circle cx="390" cy="300" r="13"/><circle cx="420" cy="310" r="17"/><circle cx="455" cy="318" r="14"/>' +
      '<circle cx="160" cy="292" r="9"/><circle cx="360" cy="290" r="9"/>' +
    '</g>' +
    '<path class="hero-ground" d="M0 370 C120 350 260 352 520 372 V420 H0 Z"/>' +
    '</svg>';

  var FEATURES = [
    { id: 'tour', icon: 'map' }, { id: 'library', icon: 'book' }, { id: 'hash', icon: 'fingerprint' },
    { id: 'links', icon: 'link' }, { id: 'awareness', icon: 'shield' }, { id: 'game', icon: 'game' },
    { id: 'about', icon: 'info' }
  ];

  function render(view) {
    var facts = I18n.t('home.facts');
    var art = el('div', { class: 'hero__art', role: 'img', i18nAttr: 'aria-label:home.heroArt' });
    art.innerHTML = HERO_SVG;

    view.appendChild(el('section', { class: 'hero' }, el('div', { class: 'container hero__inner' }, [
      el('div', { class: 'hero__text' }, [
        el('p', { class: 'eyebrow', i18n: 'home.eyebrow' }),
        el('h1', { class: 'hero__title', i18n: 'meta.siteName', id: 'page-title', tabindex: '-1' }),
        el('p', { class: 'hero__tagline', i18n: 'meta.tagline' }),
        el('p', { class: 'hero__intro', i18n: 'home.intro' }),
        el('div', { class: 'btn-row' }, [
          el('a', { class: 'btn btn--primary btn--lg', href: '#/tour' }, [el('span', { i18n: 'home.ctaTour' }), UI.icon('arrow', 'icon--dir')]),
          el('a', { class: 'btn btn--outline btn--lg', href: '#/game' }, [UI.icon('game'), el('span', { i18n: 'home.ctaGame' })])
        ])
      ]),
      art
    ])));

    view.appendChild(el('section', { class: 'section section--band' }, el('div', { class: 'container bridge' }, [
      el('div', { class: 'bridge__text' }, [
        el('h2', { class: 'section-title', i18n: 'home.bridgeTitle' }),
        el('p', { i18n: 'home.bridgeBody' })
      ]),
      el('div', { class: 'facts', 'aria-labelledby': 'facts-title' }, [
        el('h2', { class: 'facts__title', id: 'facts-title', i18n: 'home.factsTitle' }),
        el('dl', { class: 'facts__grid' }, (Array.isArray(facts) ? facts : []).map(function (_, i) {
          return el('div', { class: 'fact' }, [
            el('dt', { class: 'fact__label', i18n: 'home.facts.' + i + '.label' }),
            el('dd', { class: 'fact__value', i18n: 'home.facts.' + i + '.value' })
          ]);
        }))
      ])
    ])));

    view.appendChild(el('section', { class: 'section' }, el('div', { class: 'container' }, [
      el('h2', { class: 'section-title', i18n: 'home.featuresTitle' }),
      el('ul', { class: 'feature-grid' }, FEATURES.map(function (f) {
        return el('li', null, el('a', { class: 'feature-card', href: '#/' + f.id }, [
          el('span', { class: 'feature-card__icon' }, UI.icon(f.icon)),
          el('h3', { class: 'feature-card__title', i18n: 'home.features.' + f.id + '.title' }),
          el('p', { class: 'feature-card__desc', i18n: 'home.features.' + f.id + '.desc' }),
          el('span', { class: 'feature-card__cta' }, [el('span', { i18n: 'common.open' }), UI.icon('arrow', 'icon--dir icon--sm')])
        ]));
      })),
      el('p', { class: 'note' }, [UI.icon('info', 'icon--sm'), el('span', { i18n: 'home.accuracyNote' })])
    ])));
  }

  global.RabadhPages.home = { render: render };

  global.RabadhPages.notFound = {
    render: function (view) {
      view.appendChild(el('section', { class: 'section' }, el('div', { class: 'container narrow center' }, [
        el('h1', { class: 'page-head__title', id: 'page-title', tabindex: '-1', i18n: 'notFound.title' }),
        el('p', { i18n: 'notFound.body' }),
        el('a', { class: 'btn btn--primary', href: '#/home', i18n: 'common.backHome' })
      ])));
    }
  };
})(window);
