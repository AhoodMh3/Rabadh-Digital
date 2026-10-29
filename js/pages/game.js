/* game.js — «أنقذ تراث القلعة» / "Save the Castle’s Heritage"
 * Same questions, same order, same points and same correct answers in both
 * languages (answers are stored by index in content.js). All visible text is
 * bound to translation keys, so switching language mid-game keeps progress.
 */
(function (global) {
  'use strict';
  var UI = global.RabadhUI, I18n = global.I18n, el = UI.el;
  var G = global.RabadhContent.GAME;
  var Q = G.questions;
  var MAX = Q.length * G.pointsPerCorrect;

  function render(view, ctx) {
    var s;
    function reset() { s = { phase: 'intro', idx: 0, score: 0, shields: G.startShields, answers: [], answered: false }; }
    reset();

    var root = el('div', { class: 'game', id: 'game-root' });

    function showRules() {
      UI.openModal({ titleKey: 'game.rulesTitle', body: UI.boundList('ol', 'game.rules', 'steps') });
    }

    function shieldsNode() {
      var wrap = el('span', { class: 'shields', role: 'img', i18nAttr: 'aria-label:game.shieldsAria', i18nParams: { n: s.shields } });
      for (var i = 0; i < G.startShields; i++) wrap.appendChild(UI.icon('shield', i < s.shields ? 'shield-on' : 'shield-off'));
      return wrap;
    }

    function draw() {
      root.innerHTML = '';
      root.setAttribute('data-phase', s.phase);
      if (s.phase === 'intro') drawIntro();
      else if (s.phase === 'play') drawQuestion();
      else drawEnd();
      I18n.apply(root);
    }

    function drawIntro() {
      root.appendChild(el('div', { class: 'card game-intro' }, [
        el('div', { class: 'game-intro__badge' }, UI.icon('castle', 'icon--xl')),
        el('p', { class: 'eyebrow', i18n: 'game.subtitle' }),
        el('h2', { class: 'game-intro__title', i18n: 'game.title' }),
        el('p', { class: 'game-intro__story', i18n: 'game.story' }),
        el('ul', { class: 'stage-list' }, G.stages.map(function (st, i) {
          return el('li', null, [el('span', { class: 'stage-list__n num', text: String(i + 1) }), el('span', { i18n: 'game.stages.' + st })]);
        })),
        el('div', { class: 'btn-row btn-row--center' }, [
          el('button', { type: 'button', class: 'btn btn--primary btn--lg', id: 'game-start', onclick: function () { s.phase = 'play'; draw(); focusQuestion(); } }, [UI.icon('shield'), el('span', { i18n: 'game.start' })]),
          el('button', { type: 'button', class: 'btn btn--outline btn--lg', id: 'game-rules', onclick: showRules }, [UI.icon('info'), el('span', { i18n: 'game.showRules' })])
        ])
      ]));
    }

    function focusQuestion() {
      var h = root.querySelector('.q__text');
      if (h) h.focus({ preventScroll: false });
    }

    function drawQuestion() {
      var q = Q[s.idx], base = 'game.questions.' + q.id;
      var letters = I18n.t('game.letters');
      var hud = el('div', { class: 'hud card' }, [
        el('div', { class: 'hud__item' }, [el('span', { class: 'hud__label', i18n: 'game.stageLabel' }), el('span', { class: 'hud__value', i18n: 'game.stages.' + q.stage })]),
        el('div', { class: 'hud__item' }, el('span', { class: 'hud__value', i18n: 'game.questionOf', i18nParams: { n: s.idx + 1, total: Q.length } })),
        el('div', { class: 'hud__item' }, [el('span', { class: 'hud__label', i18n: 'game.scoreLabel' }), el('span', { class: 'hud__value num', id: 'game-score', text: String(s.score) })]),
        el('div', { class: 'hud__item' }, [el('span', { class: 'hud__label', i18n: 'game.shieldsLabel' }), shieldsNode()])
      ]);
      var bar = el('div', { class: 'progress progress--game', 'aria-hidden': 'true' }, el('span', { class: 'progress__fill', style: 'inline-size:' + ((s.idx) / Q.length * 100) + '%' }));

      var options = el('ul', { class: 'options' }, I18n.t(base + '.options').map(function (_, i) {
        var btn = el('button', { type: 'button', class: 'option', 'data-index': i, onclick: function () { answer(i); } }, [
          el('span', { class: 'option__letter', 'aria-hidden': 'true', i18n: 'game.letters.' + i }),
          el('span', { class: 'option__text' + (q.ltrOptions ? ' url-content' : ''), dir: q.ltrOptions ? 'ltr' : null, i18n: base + '.options.' + i })
        ]);
        return el('li', null, btn);
      }));
      void letters;

      var feedback = el('div', { class: 'feedback', id: 'game-feedback', role: 'status', 'aria-live': 'polite' });
      var card = el('article', { class: 'card q' }, [
        el('h2', { class: 'q__text', tabindex: '-1', i18n: base + '.text' }),
        options, feedback
      ]);
      root.appendChild(hud);
      root.appendChild(bar);
      root.appendChild(card);
      root.appendChild(el('div', { class: 'game__footer' },
        el('button', { type: 'button', class: 'btn btn--ghost btn--sm', id: 'game-quit', onclick: confirmQuit }, [UI.icon('x', 'icon--sm'), el('span', { i18n: 'game.quit' })])));
      if (s.answered) showFeedback(card);
    }

    function answer(i) {
      if (s.answered) return;
      var q = Q[s.idx];
      var ok = i === q.correct;
      s.answered = true;
      s.answers[s.idx] = i;
      if (ok) s.score += G.pointsPerCorrect; else s.shields -= 1;
      draw();
      var fb = root.querySelector('.feedback__next');
      if (fb) fb.focus();
    }

    function showFeedback(card) {
      var q = Q[s.idx], base = 'game.questions.' + q.id, chosen = s.answers[s.idx];
      var ok = chosen === q.correct;
      card.querySelectorAll('.option').forEach(function (b, i) {
        b.disabled = true;
        b.setAttribute('aria-disabled', 'true');
        if (i === q.correct) b.classList.add('is-correct');
        if (i === chosen && !ok) b.classList.add('is-wrong');
        if (i === chosen) b.setAttribute('aria-pressed', 'true');
      });
      var over = s.shields <= 0 || s.idx === Q.length - 1;
      var fb = card.querySelector('.feedback');
      fb.className = 'feedback ' + (ok ? 'feedback--ok' : 'feedback--bad');
      fb.appendChild(el('p', { class: 'feedback__title' }, [UI.icon(ok ? 'check' : 'x'), el('span', { i18n: ok ? 'game.correct' : 'game.wrong' })]));
      if (!ok) fb.appendChild(el('p', { class: 'feedback__answer' }, [
        el('span', { i18n: 'game.correctAnswerIs' }), ' ',
        el('strong', { class: q.ltrOptions ? 'url-content' : '', dir: q.ltrOptions ? 'ltr' : null, i18n: base + '.options.' + q.correct })
      ]));
      fb.appendChild(el('p', { class: 'feedback__explain', i18n: base + '.explain' }));
      fb.appendChild(el('button', { type: 'button', class: 'btn btn--primary feedback__next', id: 'game-next', onclick: next }, [
        el('span', { i18n: over ? 'game.finish' : 'game.next' }), UI.icon('arrow', 'icon--dir icon--sm')
      ]));
    }

    function next() {
      if (s.shields <= 0 || s.idx === Q.length - 1) { s.phase = 'end'; draw(); var t = root.querySelector('.end__title'); if (t) t.focus(); return; }
      s.idx += 1; s.answered = false;
      draw(); focusQuestion();
    }

    function confirmQuit() {
      UI.openModal({
        titleKey: 'game.quitTitle',
        body: el('p', { i18n: 'game.quitBody' }),
        actions: [
          { key: 'game.quitCancel', variant: 'ghost' },
          { key: 'game.quitConfirm', variant: 'danger', onClick: function () { reset(); draw(); } }
        ]
      });
    }

    function drawEnd() {
      var won = s.shields > 0;
      var correct = s.answers.filter(function (a, i) { return a === Q[i].correct; }).length;
      var rank = s.score >= 100 ? 'guardian' : s.score >= 70 ? 'defender' : 'apprentice';
      root.appendChild(el('div', { class: 'card end end--' + (won ? 'win' : 'lose'), 'data-result': won ? 'win' : 'lose' }, [
        el('div', { class: 'end__badge' }, UI.icon(won ? 'shield' : 'alert', 'icon--xl')),
        el('h2', { class: 'end__title', tabindex: '-1', i18n: won ? 'game.winTitle' : 'game.loseTitle' }),
        el('p', { i18n: won ? 'game.winBody' : 'game.loseBody' }),
        el('p', { class: 'end__score', id: 'game-final-score', i18n: 'game.finalScore', i18nParams: { score: s.score, max: MAX } }),
        el('p', { i18n: 'game.finalCorrect', i18nParams: { n: correct, total: Q.length } }),
        el('p', { class: 'end__rank', i18n: 'game.ranks.' + rank }),
        el('div', { class: 'btn-row btn-row--center' }, el('button', { type: 'button', class: 'btn btn--primary btn--lg', id: 'game-restart', onclick: function () { reset(); s.phase = 'play'; draw(); focusQuestion(); } },
          [UI.icon('refresh'), el('span', { i18n: 'game.restart' })]))
      ]));
      root.appendChild(el('section', { class: 'card review' }, [
        el('h2', { class: 'side-title', i18n: 'game.reviewTitle' }),
        el('ol', { class: 'review__list' }, Q.map(function (q, i) {
          var a = s.answers[i], base = 'game.questions.' + q.id;
          var answered = a !== undefined, ok = a === q.correct;
          var ltr = q.ltrOptions ? { class: 'url-content', dir: 'ltr' } : {};
          return el('li', { class: 'review__item ' + (!answered ? 'is-skipped' : ok ? 'is-ok' : 'is-bad') }, [
            el('p', { class: 'review__q', i18n: base + '.text' }),
            answered
              ? el('p', null, [UI.icon(ok ? 'check' : 'x', 'icon--sm'), el('span', { i18n: 'game.yourAnswer' }), ' ', el('span', { class: ltr.class, dir: ltr.dir, i18n: base + '.options.' + a })])
              : el('p', { class: 'muted', i18n: 'game.notAnswered' }),
            (!answered || !ok) ? el('p', null, [el('span', { i18n: 'game.correctAnswerIs' }), ' ', el('strong', { class: ltr.class, dir: ltr.dir, i18n: base + '.options.' + q.correct })]) : null
          ]);
        }))
      ]));
    }

    view.appendChild(el('section', { class: 'section' }, el('div', { class: 'container narrow-wide' }, [
      UI.pageHeader('meta.pages.game', null, 'game'),
      root
    ])));
    draw();
    // Expose read-only state for automated parity tests.
    global.__rabadhGame = { get state() { return JSON.parse(JSON.stringify(s)); } };
    ctx.onCleanup(function () { delete global.__rabadhGame; });
  }

  global.RabadhPages.game = { render: render };
})(window);
