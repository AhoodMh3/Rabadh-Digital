/* about.js — About the project, identity, sources, image rights, privacy, usage help */
(function (global) {
  'use strict';
  var UI = global.RabadhUI, I18n = global.I18n, el = UI.el;
  var HELP = ['lang', 'tour', 'library', 'hash', 'links', 'awareness', 'game'];

  // The official identity is shown in BOTH languages on purpose (it never changes).
  var IDENTITY = {
    nameAr: 'قلعة الربض بنسخة رقمية',
    nameEn: 'Al-Rabadh Castle: A Digital Experience',
    taglineAr: 'من عراقة الماضي إلى أمان المستقبل',
    taglineEn: 'From Historic Heritage to a Secure Digital Future'
  };

  function helpContent() {
    return el('div', { class: 'help-grid' }, [
      el('p', { class: 'muted', i18n: 'about.helpIntro' }),
      el('dl', { class: 'help-list' }, HELP.map(function (k) {
        return el('div', { class: 'help-list__item' }, [
          el('dt', { i18n: 'about.help.' + k + '.title' }),
          el('dd', { i18n: 'about.help.' + k + '.body' })
        ]);
      }))
    ]);
  }

  function identityRow(labelKey, value, lang) {
    return el('div', { class: 'identity__row' }, [
      el('dt', { i18n: labelKey }),
      el('dd', { class: 'keep-lang identity__value identity__value--' + lang, lang: lang, dir: lang === 'ar' ? 'rtl' : 'ltr', text: value })
    ]);
  }

  function render(view) {
    var S = global.RabadhContent.SOURCES;
    view.appendChild(el('section', { class: 'section' }, el('div', { class: 'container' }, [
      UI.pageHeader('about.title', 'about.intro', 'info'),
      el('div', { class: 'about-grid' }, [
        el('section', { class: 'card' }, [
          el('h2', { class: 'side-title', i18n: 'about.missionTitle' }),
          el('p', { i18n: 'about.mission' }),
          el('h2', { class: 'side-title', i18n: 'about.goalsTitle' }),
          UI.boundList('ul', 'about.goals', 'tick-list')
        ]),
        el('section', { class: 'card identity' }, [
          el('h2', { class: 'side-title', i18n: 'about.identityTitle' }),
          el('dl', { class: 'identity__list' }, [
            identityRow('about.nameArLabel', IDENTITY.nameAr, 'ar'),
            identityRow('about.nameEnLabel', IDENTITY.nameEn, 'en'),
            identityRow('about.taglineArLabel', IDENTITY.taglineAr, 'ar'),
            identityRow('about.taglineEnLabel', IDENTITY.taglineEn, 'en')
          ]),
          el('p', { class: 'note' }, [UI.icon('info', 'icon--sm'), el('span', { i18n: 'about.identityNote' })])
        ]),
        el('section', { class: 'card' }, [
          el('h2', { class: 'side-title', i18n: 'about.accuracyTitle' }),
          UI.boundList('ul', 'about.accuracy', 'tick-list')
        ]),
        el('section', { class: 'card', id: 'sources' }, [
          el('h2', { class: 'side-title', i18n: 'about.sourcesTitle' }),
          el('p', { class: 'muted', i18n: 'about.sourcesIntro' }),
          el('ol', { class: 'source-list' }, Object.keys(S).map(function (id) {
            return el('li', null, [
              el('a', { href: S[id], target: '_blank', rel: 'noopener noreferrer', class: 'ext-link' }, [
                el('span', { i18n: 'about.sources.' + id + '.name' }),
                el('span', { class: 'visually-hidden', i18n: 'common.newTab' }),
                UI.icon('external', 'icon--sm')
              ]),
              el('p', { class: 'muted', i18n: 'about.sources.' + id + '.note' })
            ]);
          }))
        ]),
        el('section', { class: 'card', id: 'image-rights' }, [
          el('h2', { class: 'side-title', i18n: 'about.imagesTitle' }),
          UI.boundList('ul', 'about.images', 'tick-list')
        ]),
        el('section', { class: 'card' }, [
          el('h2', { class: 'side-title', i18n: 'about.privacyTitle' }),
          el('p', { i18n: 'about.privacy' }),
          el('h2', { class: 'side-title', i18n: 'about.creditsTitle' }),
          el('p', { i18n: 'about.credits' })
        ]),
        el('section', { class: 'card about-help', id: 'help' }, [
          el('h2', { class: 'side-title', i18n: 'about.helpTitle' }),
          helpContent()
        ])
      ])
    ])));
  }

  global.RabadhPages.about = { render: render, helpContent: helpContent };
})(window);
