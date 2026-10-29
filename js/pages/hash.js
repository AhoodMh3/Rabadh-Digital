/* hash.js — SHA-256 file/text verification tool (runs fully in the browser) */
(function (global) {
  'use strict';
  var UI = global.RabadhUI, I18n = global.I18n, el = UI.el, H = global.RabadhHash;
  var MAX_MB = 300;

  function render(view, ctx) {
    var state = { mode: 'file', file: null, hash: '', busy: false };

    /* ----- tabs ----- */
    var tabFile = el('button', { type: 'button', role: 'tab', id: 'tab-file', class: 'tab', 'aria-selected': 'true', 'aria-controls': 'panel-file' }, el('span', { i18n: 'hash.tabFile' }));
    var tabText = el('button', { type: 'button', role: 'tab', id: 'tab-text', class: 'tab', 'aria-selected': 'false', 'aria-controls': 'panel-text', tabindex: '-1' }, el('span', { i18n: 'hash.tabText' }));
    var tablist = el('div', { class: 'tabs', role: 'tablist', i18nAttr: 'aria-label:hash.tabsLabel' }, [tabFile, tabText]);

    /* ----- file panel ----- */
    var fileInput = el('input', { type: 'file', id: 'hash-file', class: 'visually-hidden' });
    var fileInfo = el('div', { class: 'file-info' }, el('p', { class: 'muted', i18n: 'hash.noFile' }));
    var drop = el('div', { class: 'dropzone' }, [
      UI.icon('upload', 'icon--lg'),
      el('p', { class: 'dropzone__title', i18n: 'hash.dropTitle' }),
      el('p', { class: 'muted', i18n: 'hash.dropOr' }),
      el('label', { for: 'hash-file', class: 'btn btn--outline' }, el('span', { i18n: 'hash.choose' })),
      fileInput
    ]);
    var computeFileBtn = el('button', { type: 'button', class: 'btn btn--primary', id: 'hash-compute-file' }, [UI.icon('fingerprint'), el('span', { i18n: 'hash.compute' })]);
    var panelFile = el('div', { role: 'tabpanel', id: 'panel-file', 'aria-labelledby': 'tab-file', class: 'tabpanel' }, [
      drop, fileInfo,
      el('p', { class: 'privacy-note' }, [UI.icon('shield', 'icon--sm'), el('span', { i18n: 'hash.privacy' })]),
      el('div', { class: 'btn-row' }, computeFileBtn)
    ]);

    /* ----- text panel ----- */
    var textArea = el('textarea', { id: 'hash-text', class: 'input textarea', rows: '4', dir: 'auto', i18nAttr: 'placeholder:hash.textPlaceholder' });
    var computeTextBtn = el('button', { type: 'button', class: 'btn btn--primary', id: 'hash-compute-text' }, [UI.icon('fingerprint'), el('span', { i18n: 'hash.compute' })]);
    var panelText = el('div', { role: 'tabpanel', id: 'panel-text', 'aria-labelledby': 'tab-text', class: 'tabpanel', hidden: true }, [
      el('div', { class: 'field' }, [el('label', { for: 'hash-text', class: 'field__label', i18n: 'hash.textLabel' }), textArea]),
      el('div', { class: 'btn-row' }, computeTextBtn)
    ]);

    /* ----- result + compare ----- */
    var status = el('div', { class: 'status-msg', id: 'hash-status', role: 'status', hidden: true });
    var output = el('output', { class: 'hash-value', id: 'hash-output', dir: 'ltr', 'aria-live': 'polite' });
    var outputEmpty = el('p', { class: 'muted', i18n: 'hash.resultEmpty' });
    var copyBtn = el('button', { type: 'button', class: 'btn btn--ghost btn--sm', id: 'hash-copy', disabled: true }, [UI.icon('copy', 'icon--sm'), el('span', { i18n: 'hash.copy' })]);
    var expected = el('input', { type: 'text', id: 'hash-expected', class: 'input input--mono', dir: 'ltr', spellcheck: 'false', autocomplete: 'off', i18nAttr: 'placeholder:hash.comparePlaceholder' });
    var compareBtn = el('button', { type: 'button', class: 'btn btn--primary', id: 'hash-compare' }, el('span', { i18n: 'hash.compareBtn' }));
    var compareStatus = el('div', { class: 'status-msg', id: 'hash-compare-status', role: 'status', hidden: true });

    function selectTab(mode, focus) {
      state.mode = mode;
      var isFile = mode === 'file';
      tabFile.setAttribute('aria-selected', String(isFile)); tabFile.tabIndex = isFile ? 0 : -1;
      tabText.setAttribute('aria-selected', String(!isFile)); tabText.tabIndex = isFile ? -1 : 0;
      panelFile.hidden = !isFile; panelText.hidden = isFile;
      if (focus) (isFile ? tabFile : tabText).focus();
    }
    tabFile.addEventListener('click', function () { selectTab('file'); });
    tabText.addEventListener('click', function () { selectTab('text'); });
    tablist.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') {
        e.preventDefault(); selectTab(state.mode === 'file' ? 'text' : 'file', true);
      }
    });

    function showFile(file) {
      state.file = file;
      fileInfo.innerHTML = '';
      if (!file) { fileInfo.appendChild(el('p', { class: 'muted', i18n: 'hash.noFile' })); return; }
      var size = UI.formatBytes(file.size);
      fileInfo.appendChild(el('dl', { class: 'kv' }, [
        el('div', null, [el('dt', { i18n: 'hash.fileName' }), el('dd', { class: 'user-content', dir: 'auto', text: file.name })]),
        el('div', null, [el('dt', { i18n: 'hash.fileSize' }), el('dd', null, [el('span', { class: 'num', text: size.v + ' ' }), el('span', { i18n: size.unit })])]),
        el('div', null, [el('dt', { i18n: 'hash.fileType' }), file.type
          ? el('dd', { class: 'user-content mono', dir: 'ltr', text: file.type })
          : el('dd', { i18n: 'hash.unknownType' })])
      ]));
    }

    function setResult(hex) {
      state.hash = hex;
      output.textContent = hex;
      output.hidden = !hex;
      outputEmpty.hidden = !!hex;
      copyBtn.disabled = !hex;
      UI.setStatus(compareStatus, null);
    }

    fileInput.addEventListener('change', function () {
      showFile(fileInput.files[0] || null);
      setResult('');
      UI.setStatus(status, null);
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) { showFile(f); setResult(''); UI.setStatus(status, null); }
    });

    function busy(on) {
      state.busy = on;
      computeFileBtn.disabled = on; computeTextBtn.disabled = on;
      view.querySelector('.hash-tool') && view.querySelector('.hash-tool').setAttribute('aria-busy', String(on));
    }

    computeFileBtn.addEventListener('click', function () {
      if (state.busy) return;
      var f = state.file;
      if (!f) { UI.setStatus(status, 'hash.msg.noFile', 'error'); return; }
      if (f.size > MAX_MB * 1048576) { UI.setStatus(status, 'hash.msg.tooLarge', 'error', { max: MAX_MB }); return; }
      busy(true);
      UI.setStatus(status, 'hash.msg.reading', 'info');
      var reader = new FileReader();
      reader.onerror = function () { busy(false); UI.setStatus(status, 'hash.msg.readError', 'error'); };
      reader.onload = function () {
        H.digest(reader.result).then(function (hex) {
          setResult(hex);
          UI.setStatus(status, H.native ? 'hash.msg.done' : 'hash.msg.fallback', H.native ? 'success' : 'warning');
        }).catch(function () { UI.setStatus(status, 'hash.msg.readError', 'error'); })
          .then(function () { busy(false); });
      };
      reader.readAsArrayBuffer(f);
    });

    computeTextBtn.addEventListener('click', function () {
      if (state.busy) return;
      if (!textArea.value) { UI.setStatus(status, 'hash.msg.noText', 'error'); return; }
      busy(true);
      H.digestText(textArea.value).then(function (hex) {
        setResult(hex);
        UI.setStatus(status, 'hash.msg.doneText', 'success');
      }).then(function () { busy(false); });
    });

    compareBtn.addEventListener('click', function () {
      var exp = expected.value.replace(/\s+/g, '').toLowerCase();
      if (!exp) { UI.setStatus(compareStatus, 'hash.msg.noExpected', 'error'); return; }
      if (!/^[0-9a-f]{64}$/.test(exp)) { UI.setStatus(compareStatus, 'hash.msg.invalidHash', 'error'); return; }
      if (!state.hash) { UI.setStatus(compareStatus, 'hash.msg.noResult', 'warning'); return; }
      if (exp === state.hash) UI.setStatus(compareStatus, 'hash.msg.match', 'success');
      else UI.setStatus(compareStatus, 'hash.msg.mismatch', 'error');
    });

    copyBtn.addEventListener('click', function () {
      if (!state.hash) return;
      var done = function () { UI.toast('hash.msg.copied', null, 'success'); };
      var fail = function () { UI.toast('hash.msg.copyFail', null, 'error'); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(state.hash).then(done, function () { legacyCopy() ? done() : fail(); });
      } else { legacyCopy() ? done() : fail(); }
    });
    function legacyCopy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = state.hash; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        var ok = document.execCommand('copy'); ta.remove(); return ok;
      } catch (e) { return false; }
    }

    var tool = el('div', { class: 'card hash-tool' }, [
      tablist, panelFile, panelText, status,
      el('div', { class: 'result-box' }, [
        el('div', { class: 'result-box__head' }, [el('h2', { class: 'result-box__title', i18n: 'hash.resultLabel' }), copyBtn]),
        outputEmpty, output
      ]),
      el('div', { class: 'compare' }, [
        el('h2', { class: 'compare__title', i18n: 'hash.compareTitle' }),
        el('div', { class: 'field' }, [
          el('label', { for: 'hash-expected', class: 'field__label', i18n: 'hash.compareLabel' }),
          el('div', { class: 'input-row' }, [expected, compareBtn])
        ]),
        compareStatus
      ])
    ]);
    output.hidden = true;

    view.appendChild(el('section', { class: 'section' }, el('div', { class: 'container' }, [
      UI.pageHeader('hash.title', 'hash.intro', 'fingerprint'),
      el('div', { class: 'tool-layout' }, [
        tool,
        el('aside', { class: 'tool-side' }, [
          el('div', { class: 'card card--soft' }, [el('h2', { class: 'side-title', i18n: 'hash.whatTitle' }), el('p', { i18n: 'hash.whatBody' })]),
          el('div', { class: 'card card--soft' }, [el('h2', { class: 'side-title', i18n: 'hash.stepsTitle' }), UI.boundList('ol', 'hash.steps', 'steps')])
        ])
      ])
    ])));
  }

  global.RabadhPages.hash = { render: render };
})(window);
